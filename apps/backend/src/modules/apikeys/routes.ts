import { Router } from 'express';
import {
  createApiKey, getApiKeyById, getAllApiKeys, updateApiKey, deleteApiKey
} from './repository.js';
import type { CreateApiKeyInput, UpdateApiKeyInput } from './types.js';

export const apiKeyRouter = Router();

// 脱敏函数：只显示前8位和后4位
function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return '*'.repeat(key.length);
  }
  return `${key.slice(0, 8)}${'*'.repeat(key.length - 12)}${key.slice(-4)}`;
}

// 将ApiKey对象转为前端可读对象（脱敏api_key）
function toPublicApiKey(key: any) {
  return {
    id: key.id,
    provider: key.provider,
    name: key.name,
    apiKeyMasked: maskApiKey(key.apiKey),
    maxConcurrency: key.maxConcurrency,
    isActive: key.isActive,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt
  };
}

// POST / - 创建API Key
apiKeyRouter.post('/', (req, res) => {
  try {
    const { provider, name, apiKey, maxConcurrency } = req.body as CreateApiKeyInput;
    if (!provider || !name || !apiKey) {
      return res.status(400).json({ error: 'provider, name, apiKey are required' });
    }
    const created = createApiKey({ provider, name, apiKey, maxConcurrency });
    res.status(201).json(toPublicApiKey(created));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET / - 获取所有API Key（脱敏）
apiKeyRouter.get('/', (req, res) => {
  try {
    const keys = getAllApiKeys();
    res.json(keys.map(toPublicApiKey));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /:id - 获取单个（脱敏）
apiKeyRouter.get('/:id', (req, res) => {
  try {
    const key = getApiKeyById(req.params.id);
    if (!key) return res.status(404).json({ error: 'API Key not found' });
    res.json(toPublicApiKey(key));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /:id - 更新
apiKeyRouter.patch('/:id', (req, res) => {
  try {
    const input = req.body as UpdateApiKeyInput;
    const updated = updateApiKey(req.params.id, input);
    if (!updated) return res.status(404).json({ error: 'API Key not found' });
    res.json(toPublicApiKey(updated));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /:id - 删除
apiKeyRouter.delete('/:id', (req, res) => {
  try {
    const ok = deleteApiKey(req.params.id);
    if (!ok) return res.status(404).json({ error: 'API Key not found' });
    res.json({ message: 'API Key 已删除' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
