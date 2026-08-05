// apps/backend/src/modules/llm/types.ts

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_ctx?: number;
  };
}

// Token 用量细分：输入按缓存命中/未命中区分，另计缓存写入与输出。
// 各 provider 归一化后的统一结构，便于落库与统计。
export interface TokenUsageDetail {
  /** 输入中命中缓存的 tokens（不计费或按缓存折扣价计费） */
  inputCacheHitTokens: number;
  /** 输入中未命中缓存的 tokens（按标准输入价计费） */
  inputCacheMissTokens: number;
  /** 写入缓存消耗的 tokens（Anthropic 显式缓存 / OpenAI cache_write 才有值） */
  cacheWriteTokens: number;
  /** 输出 tokens */
  outputTokens: number;
}

export interface ChatResponse {
  model: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  /** 归一化后的 token 用量细分（输入命中/未命中/缓存写入/输出） */
  usage?: TokenUsageDetail;
}

export interface ModelInfo {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
}

export interface OllamaStatus {
  running: boolean;
  modelsLoaded: string[];
  error?: string;
}
