// apps/backend/src/modules/agent/supervisor.ts
// ReAct 监督模块：在每轮 Thought/Action/Observation 之后自动诊断执行质量，
// 决定 continue / retry / review / terminate。
// 当前阶段采用确定性规则（非 LLM），后续可扩展为 LLM 监督。

import type { AgentRole } from '../../types/index.js';
import type { TicketStatus } from '../../types/index.js';
import type { ReActStep } from './prompt-builder.js';

export type SupervisionDecision = 'continue' | 'retry' | 'review' | 'terminate';

export interface ChildExecutionSummary {
  ticketId: string;
  title: string;
  completed: boolean;
  error?: string;
}

export interface SupervisionContext {
  iteration: number;
  maxIterations: number;
  currentStep: ReActStep;
  stepHistory: ReActStep[];
  agentRole: AgentRole;
  ticketStatus: TicketStatus;
  childResults?: ChildExecutionSummary[];
}

export interface SupervisionResult {
  decision: SupervisionDecision;
  observation: string;
  reason: string;
  newTicketStatus?: TicketStatus;
}

/**
 * 对当前 ReAct 迭代结果进行监督判断。
 * 当前使用确定性规则，不依赖 LLM 调用。
 */
export function supervise(ctx: SupervisionContext): SupervisionResult {
  // 1. 检测无效 finish（空 thought）—— 必须在自然完成检测之前
  const invalidFinishCheck = checkInvalidFinish(ctx);
  if (invalidFinishCheck) return invalidFinishCheck;

  // 2. 自然结束的 finish / complete_ticket —— 不做干预
  if (isNaturalCompletion(ctx.currentStep)) {
    return { decision: 'continue', observation: '', reason: 'Agent 自然完成' };
  }

  // 3. 检测循环：连续 3 轮相同 Action
  const loopCheck = checkActionLoop(ctx);
  if (loopCheck) return loopCheck;

  // 4. 检测工具连续失败
  const toolFailCheck = checkRepeatedToolFailure(ctx);
  if (toolFailCheck) return toolFailCheck;

  // 5. 子工单全部失败（父工单场景）
  const childAllFailedCheck = checkAllChildrenFailed(ctx);
  if (childAllFailedCheck) return childAllFailedCheck;

  // 6. 剩余迭代不足时的兜底建议
  const lowIterWarning = buildLowIterationWarning(ctx);
  if (lowIterWarning) return lowIterWarning;

  // 7. 子工单部分失败风险提示
  const childPartialFailWarning = buildChildPartialFailWarning(ctx);
  if (childPartialFailWarning) return childPartialFailWarning;

  // 8. 工具需要审批 —— 不干预，Agent 自行决策
  if (isApprovalWaiting(ctx)) {
    return { decision: 'continue', observation: '', reason: '工具等待审批，Agent 自行决策' };
  }

  // 默认继续
  return { decision: 'continue', observation: '', reason: '' };
}

// ---- 规则实现 ----

function isNaturalCompletion(step: ReActStep): boolean {
  const action = step.action.trim();
  return action.startsWith('finish') || action.startsWith('complete_ticket');
}

function checkActionLoop(ctx: SupervisionContext): SupervisionResult | null {
  if (ctx.stepHistory.length < 2) return null;

  const last = ctx.currentStep;
  // 取最近 2 轮历史（加上当前轮共 3 轮）
  const recent = ctx.stepHistory.slice(-2);
  const allSame =
    recent.every((s) => s.action === last.action) &&
    recent[0].action === last.action;

  if (allSame && last.action.trim().length > 0) {
    return {
      decision: 'terminate',
      observation: `检测到连续 3 轮执行相同操作「${last.action.slice(0, 60)}」，Agent 可能陷入循环，已自动终止执行。请人工审核后调整任务描述或重新执行。`,
      reason: `连续 3 轮相同 Action: ${last.action.slice(0, 80)}`,
      newTicketStatus: 'failed',
    };
  }

  return null;
}

function checkRepeatedToolFailure(ctx: SupervisionContext): SupervisionResult | null {
  if (ctx.stepHistory.length < 1) return null;

  const currentObs = ctx.currentStep.observation;
  if (!isToolFailure(currentObs)) return null;

  // 提取当前工具名
  const currentTool = extractToolName(ctx.currentStep.action);
  if (!currentTool) return null;

  // 统计最近连续同工具失败次数（包括当前轮）
  let consecutiveFails = 1;
  for (let i = ctx.stepHistory.length - 1; i >= 0; i--) {
    const step = ctx.stepHistory[i];
    const stepTool = extractToolName(step.action);
    if (stepTool === currentTool && isToolFailure(step.observation)) {
      consecutiveFails++;
    } else {
      break;
    }
  }

  if (consecutiveFails === 2) {
    return {
      decision: 'retry',
      observation: `工具「${currentTool}」已连续失败 2 次，请检查参数或尝试替代方案。若下一轮仍失败将自动终止。`,
      reason: `工具 ${currentTool} 连续失败 2 次`,
    };
  }

  if (consecutiveFails >= 3) {
    return {
      decision: 'terminate',
      observation: `工具「${currentTool}」已连续失败 ${consecutiveFails} 次，可能参数或环境配置有误，已自动终止执行。请人工检查后重新尝试。`,
      reason: `工具 ${currentTool} 连续失败 ${consecutiveFails} 次`,
      newTicketStatus: 'failed',
    };
  }

  return null;
}

function checkInvalidFinish(ctx: SupervisionContext): SupervisionResult | null {
  const action = ctx.currentStep.action.trim();
  if (!action.startsWith('finish')) return null;

  const thought = ctx.currentStep.thought.trim();
  if (thought.length === 0) {
    return {
      decision: 'retry',
      observation: '无法解析有效的思考内容。请提供更详细的完成总结后再结束任务。',
      reason: 'finish 动作缺少有效 thought',
    };
  }

  return null;
}

function checkAllChildrenFailed(ctx: SupervisionContext): SupervisionResult | null {
  if (!ctx.childResults || ctx.childResults.length === 0) return null;

  const allFailed = ctx.childResults.every((c) => !c.completed);
  if (allFailed && ctx.agentRole === 'supervisor') {
    return {
      decision: 'review',
      observation: `所有 ${ctx.childResults.length} 个子工单均已失败，建议人工审核。请检查子工单失败原因后决定重新指派或调整方案。`,
      reason: '全部子工单失败',
      newTicketStatus: 'reviewing',
    };
  }

  return null;
}

function buildLowIterationWarning(ctx: SupervisionContext): SupervisionResult | null {
  const remaining = ctx.maxIterations - ctx.iteration;
  if (remaining === 2 || remaining === 1) {
    // 只在非自然结束且尚未完成时给建议
    return {
      decision: 'continue',
      observation: `剩余迭代次数仅 ${remaining} 次，请优先完成关键任务，避免在次要细节上反复尝试。`,
      reason: `剩余迭代不足 (${remaining})`,
    };
  }
  return null;
}

function buildChildPartialFailWarning(ctx: SupervisionContext): SupervisionResult | null {
  if (!ctx.childResults || ctx.childResults.length === 0) return null;

  const failedCount = ctx.childResults.filter((c) => !c.completed).length;

  // 只在有部分失败但不是全部失败时给警告（全部失败已被 checkAllChildrenFailed 处理）
  if (failedCount > 0 && failedCount < ctx.childResults.length && ctx.agentRole === 'supervisor') {
    return {
      decision: 'continue',
      observation: `${failedCount} 个子工单未完成，请评估风险并决定是否重新指派。`,
      reason: `${failedCount}/${ctx.childResults.length} 子工单失败`,
    };
  }

  return null;
}

function isApprovalWaiting(ctx: SupervisionContext): boolean {
  return ctx.currentStep.observation.includes('需要用户审批') ||
    ctx.currentStep.observation.includes('审批中心');
}

function isToolFailure(observation: string): boolean {
  if (!observation) return false;
  return observation.includes('[工具 ') && observation.includes('执行失败');
}

function extractToolName(action: string): string | null {
  const match = action.match(/^tool_call\s*\(\s*([^\s,()]+)/);
  return match ? match[1].replace(/['"]/g, '') : null;
}
