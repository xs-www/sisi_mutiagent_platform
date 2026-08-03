// apps/backend/src/modules/memory/short-term.ts

export interface ShortTermMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationBuffer {
  messages: ShortTermMessage[];
  estimatedTokens: number;
}

export class ShortTermMemoryManager {
  private buffers: Map<string, Map<string, ConversationBuffer>>;
  private maxTokens: number;
  private readonly TOKENS_PER_CHAR_ESTIMATE = 0.25;

  constructor(maxTokens: number = 4000) {
    this.buffers = new Map();
    this.maxTokens = maxTokens;
  }

  addMessage(
    agentId: string,
    sessionId: string,
    role: 'user' | 'agent' | 'system',
    content: string
  ): void {
    const buffer = this.getOrCreateBuffer(agentId, sessionId);
    const message: ShortTermMessage = {
      role,
      content,
      timestamp: Date.now()
    };

    buffer.messages.push(message);
    buffer.estimatedTokens += content.length * this.TOKENS_PER_CHAR_ESTIMATE;

    this.trim(agentId, sessionId);
  }

  getContext(agentId: string, sessionId: string): ShortTermMessage[] {
    const buffer = this.buffers.get(agentId)?.get(sessionId);
    return buffer ? buffer.messages : [];
  }

  getFormattedContext(agentId: string, sessionId: string): string {
    const messages = this.getContext(agentId, sessionId);
    if (messages.length === 0) return '';

    const roleLabels: Record<ShortTermMessage['role'], string> = {
      user: '用户',
      agent: 'Agent',
      system: '系统'
    };

    const lines = messages.map((m) => {
      const time = new Date(m.timestamp).toISOString();
      const role = roleLabels[m.role];
      return `[${role}] ${time}: ${m.content}`;
    });

    return '## 近期对话\n' + lines.join('\n');
  }

  clear(agentId: string, sessionId?: string): void {
    if (sessionId) {
      const sessions = this.buffers.get(agentId);
      if (sessions) {
        sessions.delete(sessionId);
        if (sessions.size === 0) {
          this.buffers.delete(agentId);
        }
      }
    } else {
      this.buffers.delete(agentId);
    }
  }

  getTokenCount(agentId: string, sessionId: string): number {
    const buffer = this.buffers.get(agentId)?.get(sessionId);
    return buffer ? buffer.estimatedTokens : 0;
  }

  setMaxTokens(n: number): void {
    this.maxTokens = n;
    for (const [agentId, sessions] of this.buffers) {
      for (const sessionId of sessions.keys()) {
        this.trim(agentId, sessionId);
      }
    }
  }

  private getOrCreateBuffer(
    agentId: string,
    sessionId: string
  ): ConversationBuffer {
    let sessions = this.buffers.get(agentId);
    if (!sessions) {
      sessions = new Map();
      this.buffers.set(agentId, sessions);
    }

    let buffer = sessions.get(sessionId);
    if (!buffer) {
      buffer = { messages: [], estimatedTokens: 0 };
      sessions.set(sessionId, buffer);
    }

    return buffer;
  }

  private trim(agentId: string, sessionId: string): void {
    const buffer = this.buffers.get(agentId)?.get(sessionId);
    if (!buffer) return;

    while (
      buffer.estimatedTokens > this.maxTokens &&
      buffer.messages.length > 0
    ) {
      const removed = buffer.messages.shift()!;
      buffer.estimatedTokens -=
        removed.content.length * this.TOKENS_PER_CHAR_ESTIMATE;
    }
  }
}

// Singleton instance for convenience
export const shortTermMemory = new ShortTermMemoryManager();
