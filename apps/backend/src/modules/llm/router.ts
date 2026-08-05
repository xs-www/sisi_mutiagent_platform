// apps/backend/src/modules/llm/router.ts
import { chat as ollamaChat, checkOllamaStatus } from './ollama.js';
import { chatOpenAICompatible, chatAnthropic, PROVIDER_MODELS } from './external.js';
import { config } from '../../config/index.js';
import type { ChatMessage, ChatResponse } from './types.js';
import { getActivePlatformModels } from '../platform/repository.js';
import { recordTokenUsage } from '../usage/repository.js';

type CandidateModel = {
  provider: string;
  modelName: string;
  priority: number;
  source: 'platform' | 'apikey-implicit';
};

function filterKeysByModel<T extends { id: string; maxConcurrency: number; models: string[] }>(keys: T[], modelName: string): T[] {
  // 如果 Key 的 models 为空，则可用于任意模型；否则只用于列表中的模型
  return keys.filter(k => k.models.length === 0 || k.models.includes(modelName));
}

function providerDefaultModel(provider: string): string | null {
  const candidates = PROVIDER_MODELS[provider];
  if (!candidates || candidates.length === 0) return null;
  return candidates[0];
}

function dedupeCandidates(items: CandidateModel[]): CandidateModel[] {
  const seen = new Set<string>();
  const out: CandidateModel[] = [];
  for (const item of items) {
    const key = `${item.provider}::${item.modelName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function hasAvailableApiKey(provider: string): Promise<boolean> {
  const { getActiveKeysByCategory } = await import('../apikeys/repository.js');
  const { selectAvailableKey } = await import('../apikeys/concurrency.js');
  const keys = getActiveKeysByCategory('chat').filter(k => k.provider === provider);
  if (keys.length === 0) return false;
  const keyId = selectAvailableKey(keys.map(k => ({ id: k.id, maxConcurrency: k.maxConcurrency })));
  return !!keyId;
}

async function buildPreferredCandidates(): Promise<CandidateModel[]> {
  const platformModels = getActivePlatformModels();
  const platformCandidates: CandidateModel[] = platformModels.map((m) => ({
    provider: m.provider,
    modelName: m.modelName,
    priority: m.priority,
    source: 'platform',
  }));

  // 从活跃 API Key 自动生成候选模型（即使用户未在平台模型池手动配置）
  const { getActiveKeysByCategory } = await import('../apikeys/repository.js');
  const activeKeys = getActiveKeysByCategory('chat');
  const providerSet = new Set(activeKeys.map(k => k.provider));

  const implicitCandidates: CandidateModel[] = [];
  for (const provider of providerSet) {
    if (provider === 'ollama') continue;
    const defaultModel = providerDefaultModel(provider);
    if (!defaultModel) continue;
    implicitCandidates.push({
      provider,
      modelName: defaultModel,
      priority: -100,
      source: 'apikey-implicit',
    });
  }

  const merged = dedupeCandidates([...implicitCandidates, ...platformCandidates]);
  const external = merged.filter(m => m.provider !== 'ollama');
  const local = merged.filter(m => m.provider === 'ollama');

  const extAvailable: CandidateModel[] = [];
  const extBusyOrUnavailable: CandidateModel[] = [];
  for (const item of external) {
    if (await hasAvailableApiKey(item.provider)) {
      extAvailable.push(item);
    } else {
      extBusyOrUnavailable.push(item);
    }
  }

  // 排序规则：有可用并发的外部Key优先，其次其它外部，最后本地Ollama
  extAvailable.sort((a, b) => a.priority - b.priority);
  extBusyOrUnavailable.sort((a, b) => a.priority - b.priority);
  local.sort((a, b) => a.priority - b.priority);

  return [...extAvailable, ...extBusyOrUnavailable, ...local];
}

// 从平台模型池按优先级依次尝试，直到成功。
// meta 携带归属上下文（项目/工单/Agent），用于 token 用量落库；不传时记为平台级消耗。
export async function chatWithPlatformModels(
  messages: ChatMessage[],
  options?: { temperature?: number },
  meta?: { projectId?: string; ticketId?: string; agentId?: string }
): Promise<ChatResponse> {
  const models = await buildPreferredCandidates();

  if (models.length === 0) {
    throw new Error('平台未配置任何可用模型，且未发现可用 API Key。请在平台设置中添加模型或配置 API Key。');
  }

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`[LLM] 尝试模型: ${model.provider}/${model.modelName} (priority=${model.priority}, source=${model.source})`);
      const result = await callModel(model.provider, model.modelName, messages, options);

      // 记录 token 用量（含缓存命中/未命中/输出细分），写库失败不影响调用主流程
      if (result.usage) {
        try {
          recordTokenUsage({
            projectId: meta?.projectId,
            ticketId: meta?.ticketId,
            agentId: meta?.agentId,
            provider: model.provider,
            model: model.modelName,
            purpose: 'chat',
            ...result.usage,
          });
        } catch (recordErr) {
          console.error('[Usage] 记录 token 用量失败:', recordErr);
        }
      }

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
  const apiKey = await resolveApiKey(provider, modelName);
  if (!apiKey) {
    throw new Error(`Provider "${provider}" 无可用 API Key`);
  }

  // 并发控制
  const { selectAvailableKey, acquireKey, releaseKey } = await import('../apikeys/concurrency.js');
  const { getActiveKeysByCategory } = await import('../apikeys/repository.js');
  const allKeys = getActiveKeysByCategory('chat').filter(k => k.provider === provider);
  const keys = filterKeysByModel(allKeys, modelName);
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
async function resolveApiKey(provider: string, modelName?: string): Promise<string> {
  const { getActiveKeysByCategory } = await import('../apikeys/repository.js');
  const allKeys = getActiveKeysByCategory('chat').filter(k => k.provider === provider);
  const keys = modelName ? filterKeysByModel(allKeys, modelName) : allKeys;
  if (keys.length > 0) {
    return keys[0].apiKey;
  }
  // 如果按模型过滤后没有找到，回退到任意 chat Key
  if (modelName && allKeys.length > 0) {
    return allKeys[0].apiKey;
  }
  // 兜底：配置文件
  const providerConfig = config.llm.providers[provider];
  return providerConfig?.apiKey || '';
}
