// apps/backend/src/modules/agent/action-parser.ts

export type ActionType = 'tool_call' | 'message' | 'create_ticket' | 'complete_ticket' | 'finish';

export interface ParsedAction {
  type: ActionType;
  thought: string;
  raw: string;

  // tool_call
  toolName?: string;
  toolParams?: Record<string, any>;

  // message
  messageTo?: string;
  messageContent?: string;

  // create_ticket
  ticketTitle?: string;
  ticketDescription?: string;
  ticketType?: string;
  ticketAssignee?: string;
}

export function parseAgentResponse(response: string): ParsedAction {
  const lines = response.split('\n');

  // 提取Thought
  let thought = '';
  let actionLine = '';
  let inThought = false;
  let inAction = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('Thought:')) {
      inThought = true;
      inAction = false;
      thought = trimmed.slice('Thought:'.length).trim();
    } else if (trimmed.startsWith('Action:')) {
      inThought = false;
      inAction = true;
      actionLine = trimmed.slice('Action:'.length).trim();
    } else if (inThought) {
      thought += '\n' + trimmed;
    } else if (inAction) {
      actionLine += '\n' + trimmed;
    }
  }

  thought = thought.trim();
  actionLine = actionLine.trim();

  // 解析Action
  const action = parseAction(actionLine);

  return {
    ...action,
    thought,
    raw: response
  };
}

function parseAction(actionStr: string): Omit<ParsedAction, 'thought' | 'raw'> {
  // finish()
  if (actionStr.startsWith('finish')) {
    return { type: 'finish' };
  }

  // complete_ticket()
  if (actionStr.startsWith('complete_ticket')) {
    return { type: 'complete_ticket' };
  }

  // tool_call(name, {params})
  const toolMatch = actionStr.match(/^tool_call\s*\(\s*([^,]+?)\s*,?\s*(.*)?\s*\)$/s);
  if (toolMatch) {
    const toolName = toolMatch[1].trim().replace(/['"]/g, '');
    const paramsStr = toolMatch[2]?.trim() || '{}';
    let toolParams: Record<string, any> = {};

    try {
      toolParams = JSON.parse(paramsStr);
    } catch {
      // 尝试简单的参数解析
      toolParams = parseSimpleParams(paramsStr);
    }

    return { type: 'tool_call', toolName, toolParams };
  }

  // message(to: "id", content: "text")
  const msgMatch = actionStr.match(/^message\s*\(\s*to:\s*['"]([^'"]+)['"]\s*,\s*content:\s*['"]([\s\S]+?)['"]\s*\)$/);
  if (msgMatch) {
    return {
      type: 'message',
      messageTo: msgMatch[1],
      messageContent: msgMatch[2]
    };
  }

  // create_ticket(title: "...", description: "...", type: "...", assignee: "...")
  const ticketMatch = actionStr.match(/^create_ticket\s*\(\s*(.+)\s*\)$/s);
  if (ticketMatch) {
    const params = parseSimpleParams(ticketMatch[1]);
    return {
      type: 'create_ticket',
      ticketTitle: params.title,
      ticketDescription: params.description || '',
      ticketType: params.type || 'task',
      ticketAssignee: params.assignee
    };
  }

  // 无法解析，默认为finish
  console.warn(`Unable to parse action: ${actionStr}, defaulting to finish`);
  return { type: 'finish' };
}

// 简单参数解析：处理 key: value, key: value 格式
function parseSimpleParams(str: string): Record<string, any> {
  const params: Record<string, any> = {};
  // 匹配 key: "value" 或 key: value
  const regex = /(\w+):\s*(?:"([^"]*)"|'([^']*)'|([^,}\s]+))/g;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4];
    params[key] = value;
  }

  return params;
}
