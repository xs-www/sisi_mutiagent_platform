// apps/backend/src/modules/agent/executor.ts
import { chatWithFallback } from '../llm/router.js';
import { buildReActPrompt, type ReActStep } from './prompt-builder.js';
import { parseAgentResponse } from './action-parser.js';
import type { ParsedAction } from './action-parser.js';
import type { Agent } from './types.js';
import { getTicketById, updateTicketStatus, createMessage, getMessagesByTicket } from '../ticket/repository.js';
import { addMemory } from '../memory/manager.js';
import type { ChatMessage } from '../llm/types.js';

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

  // 获取工单
  const ticket = getTicketById(ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  // 将工单状态改为进行中
  if (ticket.status === 'pending') {
    updateTicketStatus(ticketId, 'in_progress');
  }

  // 记录Agent开始执行
  createMessage({
    ticketId,
    senderType: 'system',
    senderId: 'system',
    content: `Agent ${agent.name} 开始处理工单`,
    messageType: 'text'
  });

  // ReAct循环
  for (let i = 0; i < maxIter; i++) {
    // 获取最新消息
    const messages = getMessagesByTicket(ticketId);

    // 构建Prompt
    const chatMessages = buildReActPrompt(
      agent.config,
      ticket,
      messages,
      steps,
      projectId
    );

    // 调用LLM
    let response: string;
    try {
      const result = await chatWithFallback(
        agent.config.model,
        chatMessages,
        { temperature: options?.temperature }
      );
      response = result.message.content;
    } catch (err: any) {
      error = `LLM调用失败: ${err.message}`;
      console.error(error);
      break;
    }

    // 解析响应
    const parsed = parseAgentResponse(response);
    lastAction = parsed;

    // 记录Thought到消息
    createMessage({
      ticketId,
      senderType: 'agent',
      senderId: agent.id,
      content: parsed.thought,
      messageType: 'thought'
    });

    // 执行Action
    const observation = await executeAction(parsed, agent, ticketId, projectId);

    // 记录Action和Observation
    createMessage({
      ticketId,
      senderType: 'agent',
      senderId: agent.id,
      content: parsed.raw.match(/Action:.*$/m)?.[0] || '',
      messageType: 'action'
    });

    createMessage({
      ticketId,
      senderType: 'system',
      senderId: 'system',
      content: observation,
      messageType: 'observation'
    });

    // 保存步骤
    steps.push({
      thought: parsed.thought,
      action: parsed.raw.match(/Action:.*$/m)?.[0]?.replace('Action: ', '') || '',
      observation
    });

    // 检查是否完成
    if (parsed.type === 'finish') {
      completed = true;
      break;
    }

    if (parsed.type === 'complete_ticket') {
      completed = true;
      updateTicketStatus(ticketId, 'reviewing');
      break;
    }
  }

  // 如果达到最大迭代次数未完成
  if (!completed && !error) {
    error = `达到最大迭代次数 ${maxIter}，任务未完成`;
  }

  // 记录执行结束
  createMessage({
    ticketId,
    senderType: 'system',
    senderId: 'system',
    content: completed ? `Agent ${agent.name} 完成处理` : `Agent ${agent.name} 执行结束（未完成）`,
    messageType: 'text'
  });

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
  projectId?: string
): Promise<string> {
  switch (action.type) {
    case 'tool_call':
      // Phase 2: 仅记录工具调用，实际执行在Phase 4实现
      const paramsStr = JSON.stringify(action.toolParams || {});
      return `工具 ${action.toolName} 调用已记录（参数: ${paramsStr}）。工具执行功能将在Phase 4实现。`;

    case 'message':
      // 记录消息到当前工单
      if (action.messageTo && action.messageContent) {
        createMessage({
          ticketId,
          senderType: 'agent',
          senderId: agent.id,
          content: `[发送给 ${action.messageTo}]: ${action.messageContent}`,
          messageType: 'text'
        });
        return `消息已发送给 ${action.messageTo}`;
      }
      return '消息发送失败：参数不完整';

    case 'create_ticket':
      // Phase 2: 仅记录，实际创建需要project_id
      return `创建工单请求已记录: ${action.ticketTitle}（工单创建API将在项目管理模块中实现）`;

    case 'complete_ticket':
      return '工单已标记为待审核';

    case 'finish':
      return '执行结束';

    default:
      return `未知行动类型: ${action.type}`;
  }
}
