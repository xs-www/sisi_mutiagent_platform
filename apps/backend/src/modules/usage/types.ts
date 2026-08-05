// apps/backend/src/modules/usage/types.ts

export interface TokenUsageRecord {
  id: string;
  projectId?: string;
  ticketId?: string;
  agentId?: string;
  provider: string;
  model: string;
  purpose: string;
  inputCacheHitTokens: number;
  inputCacheMissTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
  createdAt: string;
}

export interface RecordTokenUsageInput {
  projectId?: string;
  ticketId?: string;
  agentId?: string;
  provider: string;
  model: string;
  purpose?: string;
  inputCacheHitTokens?: number;
  inputCacheMissTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
}

export interface ProjectUsageSummary {
  projectId: string | null;
  projectName?: string;
  callCount: number;
  inputCacheHitTokens: number;
  inputCacheMissTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
}
