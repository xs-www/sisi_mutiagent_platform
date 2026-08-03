// apps/backend/src/modules/memory/long-term.ts
import type { IEmbeddingProvider } from './embedding.js';
import type { IVectorStore, SearchResult } from './vector-store.js';
import { cosineSimilarity } from './vector-store.js';

export class LongTermMemoryManager {
  private embeddingProvider: IEmbeddingProvider;
  private vectorStore: IVectorStore;
  private dedupThreshold: number;
  private retrievalThreshold: number;
  private defaultTopK: number;

  constructor(options: {
    embeddingProvider: IEmbeddingProvider;
    vectorStore: IVectorStore;
    dedupThreshold?: number;
    retrievalThreshold?: number;
    defaultTopK?: number;
  }) {
    this.embeddingProvider = options.embeddingProvider;
    this.vectorStore = options.vectorStore;
    this.dedupThreshold = options.dedupThreshold ?? 0.95;
    this.retrievalThreshold = options.retrievalThreshold ?? 0.5;
    this.defaultTopK = options.defaultTopK ?? 5;
  }

  async store(
    agentId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<{ id: string; existed: boolean }> {
    try {
      const embedding = await this.embeddingProvider.embedText(content);

      const existingRecords = this.vectorStore.getByAgent(agentId);
      for (const record of existingRecords) {
        const similarity = cosineSimilarity(embedding, record.vector);
        if (similarity > this.dedupThreshold) {
          return { id: record.id, existed: true };
        }
      }

      const vectorRecord = this.vectorStore.store({
        agentId,
        vector: embedding,
        content,
        metadata: metadata || {},
      });

      const { addMemory } = await import('./manager.js');
      addMemory({ agentId, memoryType: 'global', content });

      return { id: vectorRecord.id, existed: false };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to store long-term memory: ${message}`);
    }
  }

  async retrieve(
    agentId: string,
    query: string,
    topK?: number,
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.embeddingProvider.embedText(query);
      const results = this.vectorStore.search(
        agentId,
        queryEmbedding,
        topK || this.defaultTopK,
      );
      return results.filter((r) => r.score >= this.retrievalThreshold);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to retrieve long-term memory: ${message}`);
    }
  }

  async retrieveFormatted(
    agentId: string,
    query: string,
    topK?: number,
  ): Promise<string> {
    const results = await this.retrieve(agentId, query, topK);
    if (results.length === 0) return '';

    const lines = ['## 长期记忆（相关上下文）'];
    for (const r of results) {
      lines.push(`- [相似度 ${r.score.toFixed(2)}] ${r.record.content}`);
    }
    return lines.join('\n');
  }

  delete(id: string): boolean {
    return this.vectorStore.delete(id);
  }

  clearAgent(agentId: string): number {
    return this.vectorStore.deleteByAgent(agentId);
  }

  getCount(agentId: string): number {
    return this.vectorStore.getByAgent(agentId).length;
  }
}
