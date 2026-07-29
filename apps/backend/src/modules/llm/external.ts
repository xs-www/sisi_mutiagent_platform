// apps/backend/src/modules/llm/external.ts
import axios, { AxiosError } from 'axios';
import type { ChatMessage, ChatResponse } from './types.js';

// 各供应商 API Base URL
const PROVIDER_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
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
      eval_count: response.data.usage?.completion_tokens
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

    return {
      model,
      message: {
        role: 'assistant',
        content: response.data.content[0].text
      },
      done: true,
      prompt_eval_count: response.data.usage?.input_tokens,
      eval_count: response.data.usage?.output_tokens
    };
  } catch (error: any) {
    printError('anthropic', error);
    const respData: any = error.response?.data;
    const msg = respData?.error?.message || respData?.message || error.message;
    throw new Error(`LLM [anthropic] 调用失败 (${error.response?.status || 'ERR'}): ${msg}`);
  }
}
