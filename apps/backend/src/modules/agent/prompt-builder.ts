// apps/backend/src/modules/agent/prompt-builder.ts
import type { AgentConfig } from './types.js';
import type { Ticket, Message } from '../ticket/types.js';
import { memoryService } from '../memory/service.js';
import type { ChatMessage } from '../llm/types.js';
import { getProjectMemberProfiles } from '../project/repository.js';

// 平台基础工具描述
const TOOL_DESCRIPTIONS: Record<string, string> = {
  file_read: '读取文件内容。参数: { path: string }',
  file_write: '写入文件。参数: { path: string, content: string }',
  file_delete: '删除文件。参数: { path: string }（需审批）',
  shell_execute: '执行Shell命令。参数: { command: string }（需审批）',
  http_request: '发送HTTP请求。参数: { url: string, method: string, body?: string }',
  code_search: '搜索代码库。参数: { query: string, path?: string }',
  git_operation: 'Git操作。参数: { command: string, args?: string[] }',
  get_project_members: '获取当前项目组成员。参数: { projectId?: string }，可省略，系统会尽量从当前工单推断',
  create_ticket: '发起工单。参数: { projectId?: string, title: string, description?: string, type?: string, priority?: string, assignee?: string }，可省略 projectId，系统会尽量从当前工单推断'
};

export interface ReActStep {
  thought: string;
  action: string;
  observation: string;
}

export async function buildReActPrompt(
  agentConfig: AgentConfig,
  ticket: Ticket,
  messages: Message[],
  reactHistory: ReActStep[],
  projectId?: string,
  projectFolderDigest?: string
): Promise<ChatMessage[]> {
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
  systemParts.push('每次回复必须严格按照以下格式，且每步只能输出一个 Action：');
  systemParts.push('Thought: 你的思考过程');
  systemParts.push('Action: 行动类型(参数)');
  systemParts.push('重要：一次回复只能包含一个 Action 行。若要先写文件再完成工单，请先输出 file_write，等下一轮观察到写入成功后，再输出 complete_ticket。禁止在同一次回复中同时输出 file_write 与 complete_ticket。');

  // 5. 记忆（异步检索：短期上下文 + 长期语义检索）
  try {
    const memoryQuery = ticket.title + '\n' + (ticket.description || '');
    const memoryText = await memoryService.getContextForPrompt(agentConfig.id, ticket.id, memoryQuery);
    if (memoryText && memoryText !== '（暂无相关记忆）') {
      systemParts.push('\n' + memoryText);
    }
  } catch (err) {
    console.error('[prompt-builder] 记忆检索失败，跳过:', err);
  }

  if (projectId) {
    systemParts.push('\n## 工作空间约束');
    systemParts.push('你的工作目录是当前项目的工作空间（workspace 文件夹）。所有文件类工具（file_read / file_write / file_delete / code_search / git_operation）必须使用相对路径，禁止使用绝对路径或以 ../ 跳出工作空间。');
    systemParts.push('当你需要产出文章、代码、文档、技能包等任何生成物时，必须通过 file_write 写入工作空间（可使用子目录组织结构），用户将从该工作空间获取这些产物。');
    systemParts.push('你只能操控工作空间内的文件，无权访问项目目录的其他部分或系统其他位置；任何越权访问都会被工具拒绝。');

    const members = getProjectMemberProfiles(projectId);
    systemParts.push('\n## 当前项目成员（可分配对象）');
    if (members.length === 0) {
      systemParts.push('（当前项目暂无成员）');
    } else {
      for (const member of members) {
        const roleLabel = member.isSupervisor ? 'supervisor' : member.agentRole;
        systemParts.push(`- ${member.agentName} [${member.agentId}] (${roleLabel})`);
      }
    }
    systemParts.push('分配工单时必须优先从以上成员中选择 assignee，且优先使用 agentId 而不是显示名。');
    systemParts.push('如果你要创建子工单，请在 create_ticket 中显式填写 assignee 字段。');
  }

  if (projectFolderDigest) {
    systemParts.push('\n## 项目目录上下文（执行前读取）');
    systemParts.push(projectFolderDigest);
    systemParts.push('你必须基于以上项目目录上下文做决策，如需更细节再通过 file_read 读取具体文件。');
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
