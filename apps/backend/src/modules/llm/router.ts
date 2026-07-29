// apps/backend/src/modules/llm/router.ts
import { chat as ollamaChat, checkOllamaStatus } from './ollama.js';
import { chatOpenAI, chatOpenAICompatible, chatAnthropic } from './external.js';
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
  let apiKey: string;
  let keyId: string | null = null;

  // 优先使用平台Key池（支持并发管理）
  const { getActiveApiKeysByProvider } = await import('../apikeys/repository.js');
  const { selectAvailableKey, acquireKey } = await import('../apikeys/concurrency.js');

  const keys = getActiveApiKeysByProvider(modelConfig.provider);
  if (keys.length > 0) {
    // 平台有可用key，选择并发最低的
    keyId = selectAvailableKey(keys.map(k => ({ id: k.id, maxConcurrency: k.maxConcurrency })));
    if (keyId) {
      const keyObj = keys.find(k => k.id === keyId)!;
      acquireKey(keyId, keyObj.maxConcurrency);
      apiKey = keyObj.apiKey;
    } else {
      throw new Error(`All API keys for provider "${modelConfig.provider}" have reached concurrency limit`);
    }
  } else if (modelConfig.apiKey) {
    // 平台无key，回退到Agent自带key
    apiKey = modelConfig.apiKey;
  } else {
    // 最后回退到配置文件
    const providerConfig = config.llm.providers[modelConfig.provider];
    apiKey = providerConfig?.apiKey || '';
    if (!apiKey) {
      throw new Error(`No API key configured for provider: ${modelConfig.provider}`);
    }
  }

  try {
    switch (modelConfig.provider) {
      case 'openai':
        return await chatOpenAI(modelConfig.name, messages, apiKey, options);
      case 'kimi':
      case 'qwen':
      case 'deepseek':
        return await chatOpenAICompatible(modelConfig.provider, modelConfig.name, messages, apiKey, options);
      case 'anthropic':
        return await chatAnthropic(modelConfig.name, messages, apiKey, options);
      default:
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }
  } finally {
    if (keyId) {
      const { releaseKey } = await import('../apikeys/concurrency.js');
      releaseKey(keyId);
    }
  }
}
