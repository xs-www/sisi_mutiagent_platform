// apps/backend/src/modules/agent/executor.ts
import { chatWithPlatformModels } from '../llm/router.js';
import { buildReActPrompt, type ReActStep } from './prompt-builder.js';
import { parseAgentResponse } from './action-parser.js';
import type { ParsedAction } from './action-parser.js';
import type { Agent } from './types.js';
import { getTicketById, updateTicketStatus, createMessage, getMessagesByTicket, createTicket } from '../ticket/repository.js';
import { memoryService } from '../memory/service.js';
import type { ChatMessage } from '../llm/types.js';
import { resolveProjectAssignee } from '../project/repository.js';
import { dispatchChildTicketExecution } from './orchestration.js';
import { buildProjectWorkspaceDigest } from '../project/repository.js';
import { supervise } from './supervisor.js';
import type { AgentEvent, ExecutionSignal } from './events.js';

const MAX_ITERATIONS = 10; // 最大循环次数

export interface ExecutionResult {
  ticketId: string;
  agentId: string;
  iterations: number;
  completed: boolean;
  steps: ReActStep[];
  finalAction: ParsedAction;
  error?: string;
}

export interface ExecutionOptions {
  maxIterations?: number;
  temperature?: number;
  /** 执行事件回调，用于 SSE 流式推送。不传时行为与原先完全一致。 */
  onEvent?: (event: AgentEvent) => void;
  /** 取消信号，迭代顶部检测；abort 后当前迭代结束即中止。 */
  signal?: ExecutionSignal;
  /** 子工单执行上下文：存在时给所有事件打上 childTicketId/childTicketTitle 标识，供父工单 SSE 流区分渲染 */
  context?: { childTicketId?: string; childTicketTitle?: string };
}

export async function executeAgent(
  agent: Agent,
  ticketId: string,
  projectId?: string,
  options?: ExecutionOptions
): Promise<ExecutionResult> {
  const maxIter = options?.maxIterations || MAX_ITERATIONS;
  const steps: ReActStep[] = [];
  let completed = false;
  let lastAction: ParsedAction;
  let error: string | undefined;
  let failed = false;
  let projectFolderDigest: string | undefined;

  const emit = (event: AgentEvent): void => {
    // 子工单执行时，给事件打标识，前端据此把子工单步骤与父工单步骤区分渲染
    if (options?.context?.childTicketId) {
      event.childTicketId = options.context.childTicketId;
      event.childTicketTitle = options.context.childTicketTitle;
    }
    try {
      options?.onEvent?.(event);
    } catch (e) {
      // 回调异常不应影响执行主流程
      console.error('[executor] onEvent 回调异常:', e);
    }
  };
  const now = () => new Date().toISOString();

  // 获取工单
  const ticket = getTicketById(ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  // 优先使用显式传入的 projectId，否则从工单推断，确保文件操作落在项目工作空间而非 temp_workspace
  const effectiveProjectId = projectId || ticket.projectId;

  emit({ type: 'start', agentId: agent.id, agentName: agent.name, timestamp: now() });

  // 将工单状态改为进行中
  if (ticket.status === 'pending') {
    await updateTicketStatus(ticketId, 'in_progress');
    emit({ type: 'ticket_status', status: 'in_progress', timestamp: now() });
  }

  // 记录Agent开始执行
  const startMsg = await createMessage({
    ticketId,
    senderType: 'system',
    senderId: 'system',
    content: `Agent ${agent.name} 开始处理工单`,
    messageType: 'text'
  });
  emit({ type: 'message', iteration: 0, messageId: startMsg.id, content: startMsg.content, createdAt: startMsg.createdAt, senderType: 'system', timestamp: now() });

  // 主Agent在执行前必须先读取项目目录上下文
  if (effectiveProjectId && agent.role === 'supervisor') {
    projectFolderDigest = buildProjectWorkspaceDigest(effectiveProjectId);
    const digestMsg = await createMessage({
      ticketId,
      senderType: 'system',
      senderId: 'system',
      content: '执行前已读取项目目录摘要，并注入上下文供主Agent决策。',
      messageType: 'observation'
    });
    emit({ type: 'observation', iteration: 0, messageId: digestMsg.id, content: digestMsg.content, createdAt: digestMsg.createdAt, senderType: 'system', timestamp: now() });
  }

  // ReAct循环
  for (let i = 0; i < maxIter; i++) {
    // 取消检测
    if (options?.signal?.aborted) {
      error = '执行已取消';
      failed = true;
      break;
    }

    emit({ type: 'iteration_start', iteration: i + 1, timestamp: now() });

    // 获取最新消息
    const messages = getMessagesByTicket(ticketId);

    // 构建Prompt
    const chatMessages = await buildReActPrompt(
      agent.config,
      ticket,
      messages,
      steps,
      effectiveProjectId,
      projectFolderDigest
    );

    // 调用LLM（平台统一模型池）
    let response: string;
    try {
      const result = await chatWithPlatformModels(
        chatMessages,
        { temperature: options?.temperature }
      );
      response = result.message.content;
    } catch (err: any) {
      error = `LLM调用失败: ${err.message}`;
      console.error(error);
      failed = true;
      break;
    }

    // 取消检测（LLM 往返后再次检查）
    if (options?.signal?.aborted) {
      error = '执行已取消';
      failed = true;
      break;
    }

    // 解析响应
    const parsed = parseAgentResponse(response);
    lastAction = parsed;

    // 记录Thought到消息
    const thoughtMsg = await createMessage({
      ticketId,
      senderType: 'agent',
      senderId: agent.id,
      content: parsed.thought,
      messageType: 'thought'
    });
    emit({ type: 'thought', iteration: i + 1, messageId: thoughtMsg.id, content: thoughtMsg.content, createdAt: thoughtMsg.createdAt, senderType: 'agent', timestamp: now() });

    // 执行Action
    const observation = await executeAction(parsed, agent, ticketId, effectiveProjectId, emit, options?.signal);

    // 记录Action和Observation
    const actionRaw = parsed.raw.match(/Action:.*$/m)?.[0] || '';
    const actionMsg = await createMessage({
      ticketId,
      senderType: 'agent',
      senderId: agent.id,
      content: actionRaw,
      messageType: 'action'
    });
    emit({ type: 'action', iteration: i + 1, messageId: actionMsg.id, content: actionMsg.content, createdAt: actionMsg.createdAt, senderType: 'agent', timestamp: now() });

    const obsMsg = await createMessage({
      ticketId,
      senderType: 'system',
      senderId: 'system',
      content: observation,
      messageType: 'observation'
    });
    emit({ type: 'observation', iteration: i + 1, messageId: obsMsg.id, content: obsMsg.content, createdAt: obsMsg.createdAt, senderType: 'system', timestamp: now() });

    // 保存步骤
    steps.push({
      thought: parsed.thought,
      action: actionRaw.replace('Action: ', ''),
      observation
    });

    // 记录交互到记忆系统（fire-and-forget，不影响主流程）
    memoryService.recordInteraction(
      agent.id,
      ticketId,
      'agent',
      `Thought: ${parsed.thought}\nAction: ${actionRaw.replace('Action: ', '')}\nObservation: ${observation}`
    ).catch(err => console.error('[executor] 记忆记录失败:', err));

    // ==== ReAct 监督层 ====
    const supervisionResult = supervise({
      iteration: i + 1,
      maxIterations: maxIter,
      currentStep: steps[steps.length - 1],
      stepHistory: steps.slice(0, -1),
      agentRole: agent.role,
      ticketStatus: ticket.status,
    });

    // 发出监督事件（有 observation 时写消息 + 发事件）
    if (supervisionResult.observation) {
      const supMsg = await createMessage({
        ticketId,
        senderType: 'system',
        senderId: 'system',
        content: `[监督] ${supervisionResult.observation}`,
        messageType: 'observation',
      });
      emit({
        type: 'supervision',
        iteration: i + 1,
        decision: supervisionResult.decision,
        reason: supervisionResult.reason,
        suggestion: supervisionResult.observation,
        messageId: supMsg.id,
        createdAt: supMsg.createdAt,
        timestamp: now(),
      } as AgentEvent);
    }

    // 根据监督决策行动
    switch (supervisionResult.decision) {
      case 'retry':
        // 撤销本轮步骤，下一轮 Agent 会看到监督 Observation 并重新执行
        steps.pop();
        continue; // 消耗一次迭代配额，进入下一轮
      case 'review':
        await updateTicketStatus(ticketId, 'reviewing');
        emit({ type: 'ticket_status', status: 'reviewing', timestamp: now() });
        completed = false;
        // 跳出循环（不走下面的 finish/complete_ticket 检测）
        break;
      case 'terminate':
        error = supervisionResult.reason;
        failed = true;
        if (supervisionResult.newTicketStatus) {
          await updateTicketStatus(ticketId, supervisionResult.newTicketStatus);
          emit({ type: 'ticket_status', status: supervisionResult.newTicketStatus, timestamp: now() });
        }
        break; // 跳出循环
      case 'continue':
      default:
        // 正常继续，不做干预
        break;
    }

    // 如果监督已决定终止或审核，跳过后续完成检测
    if (supervisionResult.decision === 'review' || supervisionResult.decision === 'terminate') {
      break;
    }

    // 检查是否完成
    if (parsed.type === 'finish') {
      completed = true;
      break;
    }

    if (parsed.type === 'complete_ticket') {
      completed = true;
      await updateTicketStatus(ticketId, 'reviewing');
      emit({ type: 'ticket_status', status: 'reviewing', timestamp: now() });
      break;
    }
  }

  // 如果达到最大迭代次数未完成
  if (!completed && !error) {
    error = `达到最大迭代次数 ${maxIter}，任务未完成`;
    failed = true;
  }

  // 失败时将工单置为 failed 并发射状态事件
  if (failed) {
    try {
      await updateTicketStatus(ticketId, 'failed');
      emit({ type: 'ticket_status', status: 'failed', reason: error, timestamp: now() });
    } catch (e) {
      console.error('[executor] 设置 failed 状态失败:', e);
    }
  }

  // 记录执行结束
  const endMsg = await createMessage({
    ticketId,
    senderType: 'system',
    senderId: 'system',
    content: completed ? `Agent ${agent.name} 完成处理` : `Agent ${agent.name} 执行结束（未完成）`,
    messageType: 'text'
  });
  emit({ type: 'message', iteration: steps.length, messageId: endMsg.id, content: endMsg.content, createdAt: endMsg.createdAt, senderType: 'system', timestamp: now() });

  if (completed) {
    emit({ type: 'complete', iterations: steps.length, completed: true, finalActionType: lastAction!.type, timestamp: now() });
  } else {
    emit({ type: 'error', error: error || '未知错误', iterations: steps.length, timestamp: now() });
  }

  return {
    ticketId,
    agentId: agent.id,
    iterations: steps.length,
    completed,
    steps,
    finalAction: lastAction!,
    error
  };
}

async function executeAction(
  action: ParsedAction,
  agent: Agent,
  ticketId: string,
  projectId?: string,
  emit?: (event: AgentEvent) => void,
  signal?: ExecutionSignal
): Promise<string> {
  const now = () => new Date().toISOString();

  switch (action.type) {
    case 'tool_call':
      const toolName = action.toolName || '';
      const toolParams = action.toolParams || {};
      try {
        let workspacePath = '';
        if (projectId) {
          const { getProjectById } = await import('../project/repository.js');
          const proj = getProjectById(projectId);
          if (proj) workspacePath = proj.workspacePath;
        }
        if (!workspacePath) {
          workspacePath = require('path').join(process.cwd(), 'temp_workspace');
          require('fs').mkdirSync(workspacePath, { recursive: true });
        }

        const { executeTool } = await import('../tools/executor.js');
        const { isApprovalRequired } = await import('../tools/types.js');

        const toolResult = await executeTool(
          toolName,
          toolParams,
          agent.config,
          ticketId,
          workspacePath,
          { projectId, agentName: agent.name }
        );

        if (isApprovalRequired(toolResult)) {
          return `工具 "${toolName}" 需要用户审批，请在审批中心处理。审批ID: ${toolResult.approvalId}。等待用户处理后可继续执行。`;
        }

        if (toolResult.success) {
          return `[工具 ${toolName} 执行成功]` + '\n' + toolResult.output;
        } else {
          return `[工具 ${toolName} 执行失败]` + '\n' + (toolResult.error || '未知错误');
        }
      } catch (toolErr: any) {
        return `工具执行异常: ${toolErr.message}`;
      }

    case 'message':
      // 记录消息到当前工单
      if (action.messageTo && action.messageContent) {
        await createMessage({
          ticketId,
          senderType: 'agent',
          senderId: agent.id,
          content: action.messageContent,
          messageType: 'text'
        });
        return `消息已发送给 ${action.messageTo}`;
      }
      return '消息发送失败：参数不完整';

    case 'create_ticket':
      const currentTicket = getTicketById(ticketId);
      const effectiveProjectId = projectId || currentTicket?.projectId;

      if (!effectiveProjectId) {
        return '创建工单失败：缺少 projectId';
      }

      if (!action.ticketTitle) {
        return '创建工单失败：缺少工单标题';
      }

      const assignee = resolveProjectAssignee(effectiveProjectId, action.ticketAssignee);
      const createdTicket = createTicket({
        projectId: effectiveProjectId,
        title: action.ticketTitle,
        description: action.ticketDescription || '',
        type: (action.ticketType as any) || 'task',
        assigneeId: assignee?.agentId,
        createdBy: agent.id,
        parentTicketId: ticketId,
      });

      // 同步串行派发子工单执行：阻塞当前 ReAct 循环，等子工单跑完才返回。
      // 子工单执行事件通过 onEvent/signal 透传到父工单 SSE 流（带 childTicketId 标识）。
      await dispatchChildTicketExecution({
        parentTicketId: ticketId,
        createdTicket,
        projectId: effectiveProjectId,
        triggerAgentId: agent.id,
        triggerAgentName: agent.name,
        onEvent: emit,
        signal,
      });

      // 发射子工单派发事件，供父工单 SSE 流感知
      emit?.({
        type: 'child_dispatched',
        childTicketId: createdTicket.id,
        childTicketTitle: createdTicket.title,
        assigneeId: assignee?.agentId || '',
        assigneeName: assignee?.agentName,
        timestamp: now()
      });

      const createdMsg = await createMessage({
        ticketId,
        senderType: 'system',
        senderId: 'system',
        content: assignee
          ? `已创建工单并指派给 ${assignee.agentName} [${assignee.agentId}]：${createdTicket.title}`
          : `已创建工单，但未找到可用 assignee：${createdTicket.title}`,
        messageType: 'text'
      });
      emit?.({ type: 'message', iteration: 0, messageId: createdMsg.id, content: createdMsg.content, createdAt: createdMsg.createdAt, senderType: 'system', timestamp: now() });

      return assignee
        ? `工单已创建并指派给 ${assignee.agentName}`
        : '工单已创建，但未找到可用 assignee';

    case 'complete_ticket':
      return '工单已标记为待审核';

    case 'finish':
      return '执行结束';

    default:
      return `未知行动类型: ${action.type}`;
  }
}
