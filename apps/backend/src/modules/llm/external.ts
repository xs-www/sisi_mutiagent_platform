// apps/backend/src/modules/llm/external.ts
import axios, { AxiosError } from 'axios';
import type { ChatMessage, ChatResponse, TokenUsageDetail } from './types.js';

// 各供应商 API Base URL
const PROVIDER_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  bailian: 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
};

// 各供应商可用模型列表（用于前端下拉选择）
export const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  kimi: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2.6', 'kimi-k2.5', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  qwen: ['qwen3.8-max', 'qwen3.8-max-preview', 'qwen3.7-plus', 'qwen3.7-max', 'qwen3.6-flash', 'qwen-audio-3.0-tts-plus'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  bailian: [
    'qwen3.8-max',
    'qwen3.8-max-preview',
    'qwen3.7-plus',
    'qwen3.7-max',
    'qwen3.6-flash',
    'qwen-audio-3.0-tts-plus',
    'wan2.7-image',
    'wan2.7-image-pro',
    'happyhorse-1.1-i2v',
    'happyhorse-1.1-t2v',
    'happyhorse-1.1-r2v',
    'deepseek-v4-pro',
    'deepseek-v4-flash-0731',
    'glm-5.2',
  ],
};

// 过滤 undefined/null 字段，构造干净的请求体
function buildRequestBody(model: string, messages: ChatMessage[], options?: { temperature?: number }) {
  const body: Record<string, any> = {
    model,
    messages: messages.filter(m => m.content && m.content.trim().length > 0),
  };
  // 仅当 temperature 是合法数字时才添加（避免传 null 触发 400）
  if (typeof options?.temperature === 'number' && !Number.isNaN(options.temperature)) {
    body.temperature = options.temperature;
  }
  // 默认 max_tokens，防止某些 API 因缺少此字段返回 400
  if (model.toLowerCase().includes('kimi') || model.toLowerCase().includes('moonshot')) {
    body.max_tokens = 4096;
  }
  return body;
}

function printError(provider: string, error: AxiosError) {
  const status = error.response?.status;
  const respData: any = error.response?.data;
  console.error(`[LLM][${provider}] ${status} error:`, JSON.stringify(respData, null, 2));
}

// 归一化 OpenAI 兼容接口的 usage：把各家缓存字段统一为「命中/未命中/缓存写入/输出」。
// - DeepSeek：原生返回 prompt_cache_hit_tokens / prompt_cache_miss_tokens
// - OpenAI / Kimi / Qwen / 百炼：prompt_tokens_details.cached_tokens（命中部分），其余输入算未命中
function normalizeOpenAICompatibleUsage(provider: string, usage: any): TokenUsageDetail {
  const prompt = Number(usage?.prompt_tokens) || 0;
  const completion = Number(usage?.completion_tokens) || 0;

  let cacheHit = 0;
  let cacheMiss = prompt;
  let cacheWrite = 0;

  if (provider === 'deepseek' && usage?.prompt_cache_hit_tokens != null) {
    cacheHit = Number(usage.prompt_cache_hit_tokens) || 0;
    const missRaw = Number(usage?.prompt_cache_miss_tokens);
    cacheMiss = Number.isNaN(missRaw) ? Math.max(prompt - cacheHit, 0) : Math.max(missRaw, 0);
  } else {
    cacheHit = Number(usage?.prompt_tokens_details?.cached_tokens) || 0;
    cacheMiss = Math.max(prompt - cacheHit, 0);
    cacheWrite = Number(usage?.prompt_tokens_details?.cache_write_tokens) || 0;
  }

  return {
    inputCacheHitTokens: cacheHit,
    inputCacheMissTokens: cacheMiss,
    cacheWriteTokens: cacheWrite,
    outputTokens: completion,
  };
}

// 通用 OpenAI 兼容接口调用（openai/kimi/qwen/deepseek 共用）
export async function chatOpenAICompatible(
  provider: string,
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  options?: { temperature?: number }
): Promise<ChatResponse> {
  const baseUrl = PROVIDER_BASE_URL[provider] || PROVIDER_BASE_URL.openai;
  const body = buildRequestBody(model, messages, options);

  try {
    const response = await axios.post(baseUrl, body, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 120000
    });

    return {
      model,
      message: {
        role: 'assistant',
        content: response.data.choices[0].message.content
      },
      done: true,
      prompt_eval_count: response.data.usage?.prompt_tokens,
      eval_count: response.data.usage?.completion_tokens,
      usage: normalizeOpenAICompatibleUsage(provider, response.data.usage)
    };
  } catch (error: any) {
    printError(provider, error);
    const respData: any = error.response?.data;
    const msg = respData?.error?.message || respData?.message || error.message;
    throw new Error(`LLM [${provider}] 调用失败 (${error.response?.status || 'ERR'}): ${msg}`);
  }
}

// 保留原 chatOpenAI 作为 openai 的别名
export async function chatOpenAI(
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  options?: { temperature?: number }
): Promise<ChatResponse> {
  return chatOpenAICompatible('openai', model, messages, apiKey, options);
}

export async function chatAnthropic(
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  options?: { temperature?: number }
): Promise<ChatResponse> {
  // Anthropic需要分离system消息
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .filter(m => m.content && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content }));

  const body: Record<string, any> = {
    model,
    max_tokens: 4096,
    messages: chatMessages,
  };
  if (systemMsg?.content) body.system = systemMsg.content;
  if (typeof options?.temperature === 'number' && !Number.isNaN(options.temperature)) {
    body.temperature = options.temperature;
  }

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', body, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 120000
    });

    const u = response.data.usage ?? {};
    return {
      model,
      message: {
        role: 'assistant',
        content: response.data.content[0].text
      },
      done: true,
      prompt_eval_count: u.input_tokens,
      eval_count: u.output_tokens,
      // Anthropic：input_tokens 本身即未命中部分；cache_read_input_tokens 为命中部分；
      // cache_creation_input_tokens 为写入缓存消耗（显式缓存下才有值，按 125% 计费）
      usage: {
        inputCacheHitTokens: Number(u.cache_read_input_tokens) || 0,
        inputCacheMissTokens: Number(u.input_tokens) || 0,
        cacheWriteTokens: Number(u.cache_creation_input_tokens) || 0,
        outputTokens: Number(u.output_tokens) || 0,
      }
    };
  } catch (error: any) {
    printError('anthropic', error);
    const respData: any = error.response?.data;
    const msg = respData?.error?.message || respData?.message || error.message;
    throw new Error(`LLM [anthropic] 调用失败 (${error.response?.status || 'ERR'}): ${msg}`);
  }
}
