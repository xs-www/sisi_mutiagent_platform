// apps/backend/src/modules/llm/router.ts
import { chat as ollamaChat, checkOllamaStatus } from './ollama.js';
import { chatOpenAICompatible, chatAnthropic } from './external.js';
import { config } from '../../config/index.js';
import type { ChatMessage, ChatResponse } from './types.js';
import { getActivePlatformModels } from '../platform/repository.js';

// 从平台模型池按优先级依次尝试，直到成功
export async function chatWithPlatformModels(
  messages: ChatMessage[],
  options?: { temperature?: number }
): Promise<ChatResponse> {
  const models = getActivePlatformModels();

  if (models.length === 0) {
    throw new Error('平台未配置任何可用模型，请在平台设置中添加模型');
  }

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`[LLM] 尝试模型: ${model.provider}/${model.modelName} (priority=${model.priority})`);
      const result = await callModel(model.provider, model.modelName, messages, options);
      return result;
    } catch (error: any) {
      console.warn(`[LLM] 模型 ${model.provider}/${model.modelName} 调用失败: ${error.message}`);
      lastError = error;
      // 继续尝试下一个模型
    }
  }

  throw new Error(`所有平台模型均调用失败。最后错误: ${lastError?.message || 'unknown'}`);
}

// 调用单个模型
async function callModel(
  provider: string,
  modelName: string,
  messages: ChatMessage[],
  options?: { temperature?: number }
): Promise<ChatResponse> {
  // Ollama 特殊处理：检查可用性
  if (provider === 'ollama') {
    const status = await checkOllamaStatus();
    if (status.running && status.modelsLoaded.includes(modelName)) {
      return await ollamaChat(modelName, messages, options);
    }
    throw new Error(`Ollama 不可用或模型 ${modelName} 未加载`);
  }

  // 外部 API：从平台 Key 池获取 API Key
  const apiKey = await resolveApiKey(provider);
  if (!apiKey) {
    throw new Error(`Provider "${provider}" 无可用 API Key`);
  }

  // 并发控制
  const { selectAvailableKey, acquireKey, releaseKey } = await import('../apikeys/concurrency.js');
  const { getActiveApiKeysByProvider } = await import('../apikeys/repository.js');
  const keys = getActiveApiKeysByProvider(provider);
  let keyId: string | null = null;
  if (keys.length > 0) {
    keyId = selectAvailableKey(keys.map(k => ({ id: k.id, maxConcurrency: k.maxConcurrency })));
    if (keyId) {
      const keyObj = keys.find(k => k.id === keyId)!;
      acquireKey(keyId, keyObj.maxConcurrency);
    } else {
      throw new Error(`Provider "${provider}" 的所有 Key 已达并发上限`);
    }
  }

  try {
    switch (provider) {
      case 'openai':
        // openai 走 chatOpenAICompatible 统一接口
        return await chatOpenAICompatible('openai', modelName, messages, apiKey, options);
      case 'kimi':
      case 'qwen':
      case 'deepseek':
      case 'bailian':
        return await chatOpenAICompatible(provider, modelName, messages, apiKey, options);
      case 'anthropic':
        return await chatAnthropic(modelName, messages, apiKey, options);
      default:
        throw new Error(`不支持的 provider: ${provider}`);
    }
  } finally {
    if (keyId) {
      releaseKey(keyId);
    }
  }
}

// 解析 API Key：优先从平台 Key 池获取，兜底配置文件
async function resolveApiKey(provider: string): Promise<string> {
  const { getActiveApiKeysByProvider } = await import('../apikeys/repository.js');
  const keys = getActiveApiKeysByProvider(provider);
  if (keys.length > 0) {
    return keys[0].apiKey;
  }
  // 兜底：配置文件
  const providerConfig = config.llm.providers[provider];
  return providerConfig?.apiKey || '';
}
