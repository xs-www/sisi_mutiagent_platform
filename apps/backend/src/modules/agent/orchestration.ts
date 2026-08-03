import { createMessage, getTicketById } from '../ticket/repository.js';
import { getAgentFromDb } from './loader.js';
import { getProjectMembers } from '../project/repository.js';
import type { Ticket } from '../ticket/types.js';
import type { AgentEvent, ExecutionSignal } from './events.js';

export interface ChildTicketDispatchInput {
  parentTicketId?: string | null;
  createdTicket: Ticket;
  projectId?: string;
  triggerAgentId?: string;
  triggerAgentName?: string;
  /** 父工单 SSE 事件回调，子工单执行事件透传至此（带 childTicketId 标识） */
  onEvent?: (event: AgentEvent) => void;
  /** 取消信号，透传给子工单执行 */
  signal?: ExecutionSignal;
}

export interface ChildTicketDispatchResult {
  started: boolean;
  assigneeId?: string;
  reason?: string;
  completed?: boolean;
  error?: string;
}

/**
 * 同步串行派发子工单执行：阻塞调用方（父工单 ReAct 循环），等子工单跑完才返回。
 * 这样 supervisor 派出"资料查询"后会等其完成、拿到结果，再决定如何派"写文章"，
 * 天然保证 agent 间依赖顺序，避免并行导致的依赖错乱。
 * 子工单执行事件通过 onEvent 透传到父工单 SSE 流（带 childTicketId 标识），
 * 避免父工单页面在阻塞期间长时间静默。
 */
export async function dispatchChildTicketExecution(input: ChildTicketDispatchInput): Promise<ChildTicketDispatchResult> {
  const { createdTicket, parentTicketId, projectId, triggerAgentId, onEvent, signal } = input;

  const assigneeId = createdTicket.assigneeId;
  if (!assigneeId) {
    await createMessage({
      ticketId: createdTicket.id,
      senderType: 'system',
      senderId: 'system',
      content: '子工单未指定 assignee，跳过自动执行。',
      messageType: 'text',
    });
    return { started: false, reason: '缺少 assignee' };
  }

  // 循环派单检测：子工单 assignee 与触发 agent 相同
  if (parentTicketId && assigneeId === triggerAgentId) {
    await createMessage({
      ticketId: createdTicket.id,
      senderType: 'system',
      senderId: 'system',
      content: '检测到循环派单，跳过自动执行。',
      messageType: 'text',
    });
    return { started: false, reason: '检测到循环派单' };
  }

  // 循环派单检测：沿父工单链路向上遍历
  const parentTicket = parentTicketId ? getTicketById(parentTicketId) : null;
  let currentParent = parentTicket;
  const visited = new Set<string>();
  while (currentParent) {
    const parentId = currentParent.id;
    if (visited.has(parentId)) break;
    visited.add(parentId);

    if (currentParent.assigneeId && assigneeId === currentParent.assigneeId) {
      await createMessage({
        ticketId: createdTicket.id,
        senderType: 'system',
        senderId: 'system',
        content: '检测到与父级工单链路中的 assignee 相同，跳过自动执行。',
        messageType: 'text',
      });
      return { started: false, reason: '检测到循环派单' };
    }

    currentParent = currentParent.parentTicketId ? getTicketById(currentParent.parentTicketId) : null;
  }

  const agent = getAgentFromDb(assigneeId);
  if (!agent) {
    await createMessage({
      ticketId: createdTicket.id,
      senderType: 'system',
      senderId: 'system',
      content: `子工单 assignee ${assigneeId} 对应 Agent 不存在，跳过自动执行。`,
      messageType: 'text',
    });
    return { started: false, reason: 'assignee 对应 Agent 不存在' };
  }

  if (projectId) {
    const members = getProjectMembers(projectId);
    const isMember = members.some((member) => member.agentId === assigneeId);
    if (!isMember) {
      await createMessage({
        ticketId: createdTicket.id,
        senderType: 'system',
        senderId: 'system',
        content: `子工单 assignee ${assigneeId} 不在项目成员中，跳过自动执行。`,
        messageType: 'text',
      });
      return { started: false, reason: 'assignee 不在项目成员中' };
    }
  }

  await createMessage({
    ticketId: createdTicket.id,
    senderType: 'system',
    senderId: 'system',
    content: `开始执行，目标 Agent ${agent.name} (${agent.id})。`,
    messageType: 'text',
  });

  // 同步串行执行：阻塞至子工单 ReAct 循环结束。
  // context 让子工单事件带上 childTicketId/childTicketTitle，经 onEvent 透传到父工单 SSE 流。
  const { executeAgent } = await import('./executor.js');
  let result;
  try {
    result = await executeAgent(agent, createdTicket.id, projectId, {
      maxIterations: 10,
      onEvent,
      signal,
      context: { childTicketId: createdTicket.id, childTicketTitle: createdTicket.title },
    });
  } catch (e: any) {
    if (parentTicketId) {
      await createMessage({
        ticketId: parentTicketId,
        senderType: 'system',
        senderId: 'system',
        content: `⚠️ 子工单「${createdTicket.title}」执行异常：${e.message}`,
        messageType: 'text',
      });
    }
    return { started: true, assigneeId, completed: false, error: e.message };
  }

  // 回写父工单完成/失败状态（结构化风险评估）
  if (parentTicketId) {
    if (result.completed) {
      await createMessage({
        ticketId: parentTicketId,
        senderType: 'system',
        senderId: 'system',
        content: `子工单「${createdTicket.title}」已完成（${result.iterations} 轮迭代）。`,
        messageType: 'text',
      });
    } else {
      await createMessage({
        ticketId: parentTicketId,
        senderType: 'system',
        senderId: 'system',
        content:
          `[风险提示] 子工单「${createdTicket.title}」执行未完成\n` +
          `- 失败原因：${result.error ?? '未知'}\n` +
          `- 已完成迭代：${result.iterations} 轮\n` +
          `- 建议：请评估是否需要重新指派或人工介入`,
        messageType: 'text',
      });
    }
  }

  return { started: true, assigneeId, completed: result.completed, error: result.error };
}
