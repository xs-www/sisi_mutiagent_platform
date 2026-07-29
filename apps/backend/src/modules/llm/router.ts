// apps/backend/src/modules/llm/router.ts
import { chat as ollamaChat, checkOllamaStatus } from './ollama.js';
import { chatOpenAI, chatAnthropic } from './external.js';
import { config } from '../../config/index.js';
import type { ChatMessage, ChatResponse } from './types.js';
import type { AgentModelConfig } from '../agent/types.js';

export async function chatWithFallback(
  modelConfig: AgentModelConfig,
  messages: ChatMessage[],
  options?: { temperature?: number }
): Promise<ChatResponse> {
  // 尝试主模型
  try {
    if (modelConfig.provider === 'ollama') {
      const status = await checkOllamaStatus();
      if (status.running && status.modelsLoaded.includes(modelConfig.name)) {
        return await ollamaChat(modelConfig.name, messages, options);
      }
      // Ollama不可用或模型未加载，尝试fallback
      if (modelConfig.fallback) {
        return await callExternal(modelConfig.fallback, messages, options);
      }
      throw new Error(`Ollama not available or model ${modelConfig.name} not loaded, no fallback configured`);
    }

    // 非ollama直接调用外部API
    return await callExternal({
      provider: modelConfig.provider,
      name: modelConfig.name,
      apiKey: modelConfig.apiKey
    }, messages, options);
  } catch (error: any) {
    // 主模型失败，尝试fallback
    if (modelConfig.fallback) {
      console.warn(`Primary model failed (${error.message}), falling back to ${modelConfig.fallback.provider}/${modelConfig.fallback.name}`);
      return await callExternal(modelConfig.fallback, messages, options);
    }
    throw error;
  }
}

async function callExternal(
  modelConfig: { provider: string; name: string; apiKey?: string },
  messages: ChatMessage[],
  options?: { temperature?: number }
): Promise<ChatResponse> {
  // 解析API Key：优先使用Agent配置，回退到平台配置
  const apiKey = resolveApiKey(modelConfig.provider, modelConfig.apiKey);

  if (!apiKey) {
    throw new Error(`No API key configured for provider: ${modelConfig.provider}`);
  }

  switch (modelConfig.provider) {
    case 'openai':
      return await chatOpenAI(modelConfig.name, messages, apiKey, options);
    case 'anthropic':
      return await chatAnthropic(modelConfig.name, messages, apiKey, options);
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}

function resolveApiKey(provider: string, agentKey?: string): string {
  // Agent配置优先
  if (agentKey) {
    return agentKey;
  }

  // 回退到平台配置
  const providerConfig = config.llm.providers[provider];
  return providerConfig?.apiKey || '';
}
