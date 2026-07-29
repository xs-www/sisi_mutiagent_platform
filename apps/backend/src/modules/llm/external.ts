// apps/backend/src/modules/llm/external.ts
import axios from 'axios';
import type { ChatMessage, ChatResponse } from './types.js';

export async function chatOpenAI(
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  options?: { temperature?: number }
): Promise<ChatResponse> {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
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
