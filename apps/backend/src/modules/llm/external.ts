// apps/backend/src/modules/llm/external.ts
import axios from 'axios';
import type { ChatMessage, ChatResponse } from './types.js';

// 各供应商 API Base URL
const PROVIDER_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
};

// 通用 OpenAI 兼容接口调用（openai/kimi/qwen/deepseek 共用）
export async function chatOpenAICompatible(
  provider: string,
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  options?: { temperature?: number }
): Promise<ChatResponse> {
  const baseUrl = PROVIDER_BASE_URL[provider] || PROVIDER_BASE_URL.openai;
  const response = await axios.post(baseUrl, {
    model,
    messages,
    temperature: options?.temperature
  }, {
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
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model,
    max_tokens: 4096,
    system: systemMsg?.content,
    messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    temperature: options?.temperature
  }, {
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
}
