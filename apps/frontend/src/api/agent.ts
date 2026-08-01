import { http } from './http';
import type { Agent, AgentEvent } from '../types';

export interface GeneratedAgentConfig {
  id: string;
  name: string;
  description: string;
  role: 'supervisor' | 'specialist';
  systemPrompt: string;
  personality: string;
  goal: string;
  constraints: string;
  methods: string;
  outputFormat: string;
  refusalStrategy: string;
  tools: string[];
  globalMemory: boolean;
  projectMemory: boolean;
}

export async function getAgents(): Promise<Agent[]> {
  const resp = await http.get('/agents');
  return resp.data;
}

export async function getAgent(id: string): Promise<Agent> {
  const resp = await http.get(`/agents/${id}`);
  return resp.data;
}

export async function deleteAgent(id: string): Promise<void> {
  await http.delete(`/agents/${id}`);
}

export async function updateAgent(id: string, updates: Partial<{
  name: string;
  description?: string;
  role: 'supervisor' | 'specialist';
  prompt: { system: string; personality?: string };
  tools: { predefined: string[]; approvalRequired?: string[] };
  memory: { global: boolean; project: boolean };
  skills: string[];
  instructions: {
    goal?: string;
    constraints?: string;
    methods?: string;
    outputFormat?: string;
    refusalStrategy?: string;
  };
}>): Promise<Agent> {
  const resp = await http.put(`/agents/${id}`, updates);
  return resp.data;
}

export async function createAgent(body: {
  id: string;
  name: string;
  description?: string;
  role: 'supervisor' | 'specialist';
  prompt: { system: string; personality?: string };
  tools: { predefined: string[]; approvalRequired?: string[] };
  memory: { global: boolean; project: boolean };
  instructions?: {
    goal?: string;
    constraints?: string;
    methods?: string;
    outputFormat?: string;
    refusalStrategy?: string;
  };
}): Promise<Agent> {
  const resp = await http.post('/agents', body);
  return resp.data;
}

export async function executeAgent(
  agentId: string,
  body: { ticketId: string; projectId?: string; maxIterations?: number; temperature?: number }
): Promise<{ ticketId: string; agentId: string; iterations: number; completed: boolean; error?: string }> {
  const resp = await http.post(`/agents/${agentId}/execute`, body);
  return resp.data;
}

export interface ExecuteStreamHandlers {
  onEvent: (event: AgentEvent) => void;
  onComplete?: (result: { iterations: number; completed: boolean; error?: string }) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

/**
 * SSE 流式执行 Agent：用 fetch + ReadableStream 消费 text/event-stream，
 * 逐条事件回调 onEvent 实时更新 UI。流结束后 onComplete 给出汇总结果。
 */
export async function executeAgentStream(
  agentId: string,
  body: { ticketId: string; projectId?: string; maxIterations?: number; temperature?: number },
  handlers: ExecuteStreamHandlers
): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch(`/api/agents/${agentId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal: handlers.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      handlers.onError?.(new Error('执行已取消'));
    } else {
      handlers.onError?.(new Error('SSE 连接失败: ' + (e?.message || String(e))));
    }
    return;
  }

  if (!resp.ok || !resp.body) {
    handlers.onError?.(new Error('SSE 连接失败: ' + resp.status));
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResult: { iterations: number; completed: boolean; error?: string } = {
    iterations: 0,
    completed: false,
  };

  const dispatchFrame = (frame: string): void => {
    let eventType = 'message';
    const dataLines: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (dataLines.length === 0) return;
    try {
      const payload = JSON.parse(dataLines.join('\n'));
      const event = { type: eventType, ...payload } as AgentEvent;
      handlers.onEvent(event);
      if (event.type === 'complete') {
        finalResult = { iterations: event.iterations, completed: event.completed, error: undefined };
      } else if (event.type === 'error') {
        finalResult = { iterations: event.iterations, completed: false, error: event.error };
      }
    } catch {
      // 跳过损坏帧
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE 帧以空行分隔；处理 chunk 边界，仅在完整帧出现时解析
      let sep: number;
      while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, '');
        dispatchFrame(frame);
      }
    }
    // flush 残留
    if (buffer.trim()) dispatchFrame(buffer);
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      handlers.onError?.(new Error('执行已取消'));
      return;
    }
    handlers.onError?.(new Error('SSE 读取异常: ' + (e?.message || String(e))));
    return;
  }

  handlers.onComplete?.(finalResult);
}

// AI 生成 Agent 配置（不落库，返回供前端审阅与回填表单）
export async function generateAgent(body: { description: string; temperature?: number }): Promise<GeneratedAgentConfig> {
  const resp = await http.post('/agents/generate', body);
  return resp.data;
}
