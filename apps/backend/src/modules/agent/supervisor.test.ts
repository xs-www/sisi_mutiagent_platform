import { describe, expect, it } from 'vitest';
import { supervise, type SupervisionContext } from './supervisor.js';
import type { ReActStep } from './prompt-builder.js';

function makeStep(thought: string, action: string, observation: string): ReActStep {
  return { thought, action, observation };
}

function makeCtx(overrides: Partial<SupervisionContext> = {}): SupervisionContext {
  return {
    iteration: 1,
    maxIterations: 10,
    currentStep: makeStep('做一些事情', 'tool_call(read_file, {"path":"test.txt"})', '[工具 read_file 执行成功]\n文件内容: hello'),
    stepHistory: [],
    agentRole: 'specialist',
    ticketStatus: 'in_progress',
    ...overrides,
  };
}

describe('supervise', () => {
  // === 正常完成不干预 ===
  it('自然 finish 返回 continue', () => {
    const ctx = makeCtx({
      currentStep: makeStep('任务完成', 'finish()', '执行结束'),
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
    expect(result.observation).toBe('');
  });

  it('自然 complete_ticket 返回 continue', () => {
    const ctx = makeCtx({
      currentStep: makeStep('提交审核', 'complete_ticket()', '工单已标记为待审核'),
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
    expect(result.observation).toBe('');
  });

  // === 循环检测 ===
  it('连续 3 轮相同 Action 返回 terminate', () => {
    const sameStep = makeStep('反复尝试', 'tool_call(same_tool, {"param":"x"})', '[工具 same_tool 执行成功]');
    const ctx = makeCtx({
      currentStep: sameStep,
      stepHistory: [
        makeStep('尝试 1', 'tool_call(same_tool, {"param":"x"})', '[工具 same_tool 执行成功]'),
        makeStep('尝试 2', 'tool_call(same_tool, {"param":"x"})', '[工具 same_tool 执行成功]'),
      ],
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('terminate');
    expect(result.newTicketStatus).toBe('failed');
  });

  it('不足 3 轮不触发循环检测', () => {
    const sameStep = makeStep('反复尝试', 'tool_call(same_tool, {"param":"x"})', '[工具 same_tool 执行成功]');
    const ctx = makeCtx({
      currentStep: sameStep,
      stepHistory: [
        makeStep('尝试 1', 'tool_call(same_tool, {"param":"x"})', '[工具 same_tool 执行成功]'),
      ],
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
  });

  // === 工具连续失败检测 ===
  it('同一工具连续失败 2 次返回 retry', () => {
    const failStep = makeStep('尝试读取', 'tool_call(read_file, {"path":"test.txt"})', '[工具 read_file 执行失败]\n文件不存在');
    const ctx = makeCtx({
      currentStep: failStep,
      stepHistory: [
        makeStep('第一次尝试', 'tool_call(read_file, {"path":"test.txt"})', '[工具 read_file 执行失败]\n文件不存在'),
      ],
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('retry');
    expect(result.observation).toContain('read_file');
  });

  it('同一工具连续失败 3 次返回 terminate', () => {
    const failStep = makeStep('再次尝试', 'tool_call(read_file, {"path":"test.txt"})', '[工具 read_file 执行失败]\n文件不存在');
    const ctx = makeCtx({
      currentStep: failStep,
      stepHistory: [
        makeStep('第一次尝试', 'tool_call(read_file, {"path":"test.txt"})', '[工具 read_file 执行失败]\n文件不存在'),
        makeStep('第二次尝试', 'tool_call(read_file, {"path":"test.txt"})', '[工具 read_file 执行失败]\n文件不存在'),
      ],
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('terminate');
    expect(result.newTicketStatus).toBe('failed');
  });

  // === 无效 finish ===
  it('finish 但 thought 为空返回 retry', () => {
    const ctx = makeCtx({
      currentStep: makeStep('', 'finish()', '执行结束'),
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('retry');
  });

  it('finish 有 thought 不触发 retry', () => {
    // 注意：finish 首先被 isNaturalCompletion 捕获，返回 continue
    const ctx = makeCtx({
      currentStep: makeStep('任务已完成，总结如下...', 'finish()', '执行结束'),
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
  });

  // === 剩余迭代不足 ===
  it('剩余 2 次迭代时给出兜底建议', () => {
    const ctx = makeCtx({
      iteration: 8,
      maxIterations: 10,
      currentStep: makeStep('继续做任务', 'tool_call(write_file, {})', '[工具 write_file 执行成功]'),
      stepHistory: [],
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
    expect(result.observation).toContain('剩余迭代次数');
  });

  it('剩余 1 次迭代时给出兜底建议', () => {
    const ctx = makeCtx({
      iteration: 9,
      maxIterations: 10,
      currentStep: makeStep('继续做任务', 'tool_call(write_file, {})', '[工具 write_file 执行成功]'),
      stepHistory: [],
    });
    const result = supervise(ctx);
    expect(result.observation).toContain('剩余迭代次数');
    expect(result.observation).toContain('1');
  });

  // === 子工单失败检测 ===
  it('所有子工单失败 + supervisor 角色返回 review', () => {
    const ctx = makeCtx({
      iteration: 3,
      agentRole: 'supervisor',
      currentStep: makeStep('检查子工单结果', 'tool_call(read_file, {})', '[工具 read_file 执行成功]'),
      stepHistory: [],
      childResults: [
        { ticketId: 'c1', title: '子工单A', completed: false, error: 'LLM调用失败' },
        { ticketId: 'c2', title: '子工单B', completed: false, error: '工具执行异常' },
      ],
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('review');
    expect(result.newTicketStatus).toBe('reviewing');
  });

  it('部分子工单失败返回 continue + 警告', () => {
    const ctx = makeCtx({
      iteration: 3,
      agentRole: 'supervisor',
      currentStep: makeStep('检查子工单结果', 'tool_call(read_file, {})', '[工具 read_file 执行成功]'),
      stepHistory: [],
      childResults: [
        { ticketId: 'c1', title: '子工单A', completed: true },
        { ticketId: 'c2', title: '子工单B', completed: false, error: '工具执行异常' },
      ],
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
    expect(result.observation).toContain('1 个子工单未完成');
  });

  // === 审批等待不干预 ===
  it('工具等待审批时不干预', () => {
    const ctx = makeCtx({
      currentStep: makeStep('需要审批', 'tool_call(dangerous_tool, {})', '工具 "dangerous_tool" 需要用户审批，请在审批中心处理。'),
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
    expect(result.observation).toBe('');
  });

  // === 正常工具成功不干预 ===
  it('正常工具调用成功返回 continue 无 observation', () => {
    const ctx = makeCtx({
      currentStep: makeStep('读取文件', 'tool_call(read_file, {"path":"test.txt"})', '[工具 read_file 执行成功]\n文件内容: hello'),
    });
    const result = supervise(ctx);
    expect(result.decision).toBe('continue');
    expect(result.observation).toBe('');
  });
});
