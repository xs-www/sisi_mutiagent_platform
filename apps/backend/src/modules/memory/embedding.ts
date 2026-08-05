// apps/backend/src/modules/memory/embedding.ts
import axios, { AxiosError } from 'axios';

const PROVIDER_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
};

export interface IEmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private readonly model: string;
  private readonly apiKey?: string;
  private readonly baseUrl?: string;
  private static warnedNoKey = false;

  constructor(options?: { model?: string; apiKey?: string; baseUrl?: string }) {
    this.model = options?.model || 'text-embedding-3-small';
    this.apiKey = options?.apiKey;
    this.baseUrl = options?.baseUrl;
  }

  private logOnceNoEmbeddingKey(): void {
    if (!OpenAIEmbeddingProvider.warnedNoKey) {
      OpenAIEmbeddingProvider.warnedNoKey = true;
      console.warn('[Embedding] 未找到含 embedding 类别的 API Key，长期记忆（语义检索）将跳过。');
    }
  }

  async embedText(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    return result[0] || [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const apiKey = this.apiKey || await this.getApiKey();
    const url = this.baseUrl || this.getBaseUrl();

    if (!apiKey) {
      this.logOnceNoEmbeddingKey();
      return [];
    }

    const body = {
      model: this.model,
      input: texts,
      encoding_format: 'float',
    };

    try {
      const response = await axios.post(url, body, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 30000,
      });

      return response.data.data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const respData: any = axiosError.response?.data;
      console.error(`[Embedding] ${status} error:`, JSON.stringify(respData, null, 2));
      const msg = respData?.error?.message || respData?.message || axiosError.message;
      throw new Error(`Embedding API 调用失败 (${status || 'ERR'}): ${msg}`);
    }
  }

  private async getApiKey(): Promise<string> {
    // 优先从平台 Key 池获取包含 'embedding' 类别的活跃 Key
    try {
      const { getActiveKeysByCategory } = await import('../apikeys/repository.js');
      const keys = getActiveKeysByCategory('embedding');
      if (keys.length > 0) {
        return keys[0].apiKey;
      }
    } catch {
      // apikeys module not available, fall through to config
    }

    // 兜底：配置文件
    try {
      const { config } = await import('../../config/index.js');
      const providerConfig = config.llm.providers['openai'];
      return providerConfig?.apiKey || '';
    } catch {
      return '';
    }
  }

  private getBaseUrl(): string {
    const chatUrl = this.baseUrl || PROVIDER_BASE_URL.openai;
    return chatUrl.replace('/chat/completions', '/embeddings');
  }
}

export function createEmbeddingProvider(options?: {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}): IEmbeddingProvider {
  return new OpenAIEmbeddingProvider(options);
}
