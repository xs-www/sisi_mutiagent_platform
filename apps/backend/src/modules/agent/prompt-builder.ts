// apps/backend/src/modules/agent/prompt-builder.ts
import type { AgentConfig } from './types.js';
import type { Ticket, Message } from '../ticket/types.js';
import { formatMemoriesForPrompt } from '../memory/index.js';
import type { ChatMessage } from '../llm/types.js';

// 平台基础工具描述
const TOOL_DESCRIPTIONS: Record<string, string> = {
  file_read: '读取文件内容。参数: { path: string }',
  file_write: '写入文件。参数: { path: string, content: string }',
  file_delete: '删除文件。参数: { path: string }（需审批）',
  shell_execute: '执行Shell命令。参数: { command: string }（需审批）',
  http_request: '发送HTTP请求。参数: { url: string, method: string, body?: string }',
  code_search: '搜索代码库。参数: { query: string, path?: string }',
  git_operation: 'Git操作。参数: { command: string, args?: string[] }'
};

export interface ReActStep {
  thought: string;
  action: string;
  observation: string;
}

export function buildReActPrompt(
  agentConfig: AgentConfig,
  ticket: Ticket,
  messages: Message[],
  reactHistory: ReActStep[],
  projectId?: string
): ChatMessage[] {
  const chatMessages: ChatMessage[] = [];

  // 1. System Prompt
  const systemParts: string[] = [];

  systemParts.push(agentConfig.prompt.system);

  if (agentConfig.prompt.personality) {
    systemParts.push(`\n## 你的性格特征\n${agentConfig.prompt.personality}`);
  }

  // 2. 可用工具
  systemParts.push('\n## 可用工具');
  systemParts.push('你可以通过以下格式调用工具：');
  systemParts.push('Action: tool_call(工具名, {参数})');
  systemParts.push('');
  systemParts.push('### 工具列表:');
  for (const toolName of agentConfig.tools.predefined) {
    const desc = TOOL_DESCRIPTIONS[toolName] || toolName;
    systemParts.push(`- ${toolName}: ${desc}`);
  }

  // 3. 行动类型说明
  systemParts.push('\n## 行动类型');
  systemParts.push('你可以执行以下行动：');
  systemParts.push('- Action: tool_call(工具名, {参数}) - 调用工具');
  systemParts.push('- Action: message(to: "Agent ID或user", content: "消息内容") - 发送消息');
  systemParts.push('- Action: create_ticket(title: "标题", description: "描述", type: "task", assignee: "Agent ID") - 创建工单');
  systemParts.push('- Action: complete_ticket() - 标记当前工单完成');
  systemParts.push('- Action: finish() - 结束本轮执行');

  // 4. 输出格式
  systemParts.push('\n## 输出格式');
  systemParts.push('每次回复必须严格按照以下格式：');
  systemParts.push('Thought: 你的思考过程');
  systemParts.push('Action: 行动类型(参数)');

  // 5. 记忆
  const memoryText = formatMemoriesForPrompt(agentConfig.id, projectId);
  if (memoryText !== '（暂无记忆）') {
    systemParts.push('\n## 记忆');
    systemParts.push(memoryText);
  }

  chatMessages.push({
    role: 'system',
    content: systemParts.join('\n')
  });

  // 6. 当前工单信息
  const ticketInfo = `## 当前工单
- 标题: ${ticket.title}
- 描述: ${ticket.description}
- 类型: ${ticket.type}
- 优先级: ${ticket.priority}
- 状态: ${ticket.status}`;

  // 7. 对话历史 + ReAct历史
  const userParts: string[] = [];
  userParts.push(ticketInfo);

  // 对话历史
  if (messages.length > 0) {
    userParts.push('\n## 对话历史');
    for (const msg of messages) {
      const sender = msg.senderType === 'user' ? '用户' : msg.senderId;
      userParts.push(`[${sender}] (${msg.messageType}): ${msg.content}`);
    }
  }

  // ReAct执行历史
  if (reactHistory.length > 0) {
    userParts.push('\n## 思考-行动-观察历史');
    for (let i = 0; i < reactHistory.length; i++) {
      const step = reactHistory[i];
      userParts.push(`\n--- 第${i + 1}轮 ---`);
      userParts.push(`Thought: ${step.thought}`);
      userParts.push(`Action: ${step.action}`);
      userParts.push(`Observation: ${step.observation}`);
    }
  }

  userParts.push('\n现在请思考下一步：');

  chatMessages.push({
    role: 'user',
    content: userParts.join('\n')
  });

  return chatMessages;
}
