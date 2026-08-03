// apps/backend/src/modules/memory/service.ts

import { ShortTermMemoryManager, shortTermMemory } from './short-term.js';
import { LongTermMemoryManager } from './long-term.js';
import type { SearchResult } from './vector-store.js';
import { SQLiteVectorStore } from './vector-store.js';
import { createEmbeddingProvider } from './embedding.js';

export class MemoryService {
  public shortTerm: ShortTermMemoryManager;
  public longTerm: LongTermMemoryManager;
  private longTermEnabled: boolean;

  constructor(options?: {
    shortTermMaxTokens?: number;
    longTermDedupThreshold?: number;
    longTermRetrievalThreshold?: number;
    longTermTopK?: number;
  }) {
    this.shortTerm = new ShortTermMemoryManager(options?.shortTermMaxTokens ?? 4000);

    const embeddingProvider = createEmbeddingProvider();
    const vectorStore = new SQLiteVectorStore();

    this.longTerm = new LongTermMemoryManager({
      embeddingProvider,
      vectorStore,
      dedupThreshold: options?.longTermDedupThreshold,
      retrievalThreshold: options?.longTermRetrievalThreshold,
      defaultTopK: options?.longTermTopK,
    });

    this.longTermEnabled = true;
  }

  async getContextForPrompt(
    agentId: string,
    sessionId: string,
    currentQuery?: string,
  ): Promise<string> {
    const shortTermContext = this.shortTerm.getFormattedContext(agentId, sessionId);

    let longTermContext = '';
    if (currentQuery && this.longTermEnabled) {
      try {
        longTermContext = await this.longTerm.retrieveFormatted(agentId, currentQuery);
      } catch (err: unknown) {
        console.warn('[MemoryService] 长期记忆检索失败，跳过:', err);
      }
    }

    if (!shortTermContext && !longTermContext) {
      return '（暂无相关记忆）';
    }

    const parts: string[] = ['## 记忆'];

    if (shortTermContext) {
      parts.push('');
      parts.push(shortTermContext);
    }

    if (longTermContext) {
      parts.push('');
      parts.push(longTermContext);
    }

    return parts.join('\n');
  }

  async recordInteraction(
    agentId: string,
    sessionId: string,
    role: 'user' | 'agent' | 'system',
    content: string,
  ): Promise<void> {
    this.shortTerm.addMessage(agentId, sessionId, role, content);

    if (this.longTermEnabled && (role === 'agent' || role === 'system') && content.length > 50) {
      this.longTerm
        .store(agentId, content, { source: 'interaction', role, sessionId })
        .catch((err: unknown) =>
          console.error('[MemoryService] 长期记忆存储失败:', err),
        );
    }
  }

  async addMemory(
    agentId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const result = await this.longTerm.store(agentId, content, metadata);
    return result.id;
  }

  async searchMemories(
    agentId: string,
    query: string,
    topK?: number,
  ): Promise<SearchResult[]> {
    return this.longTerm.retrieve(agentId, query, topK);
  }

  deleteMemory(id: string): boolean {
    return this.longTerm.delete(id);
  }

  clearShortTerm(agentId: string, sessionId?: string): void {
    this.shortTerm.clear(agentId, sessionId);
  }

  clearLongTerm(agentId: string): number {
    return this.longTerm.clearAgent(agentId);
  }
}

// Singleton instance for application-wide use
export const memoryService = new MemoryService();
