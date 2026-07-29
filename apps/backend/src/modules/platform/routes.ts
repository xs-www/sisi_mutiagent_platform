import { Router } from 'express';
import {
  createPlatformModel, getPlatformModelById, getAllPlatformModels,
  updatePlatformModel, deletePlatformModel
} from './repository.js';
import type { CreatePlatformModelInput, UpdatePlatformModelInput } from './types.js';

export const platformRouter = Router();

// 获取所有平台模型
platformRouter.get('/models', (req, res) => {
  try {
    const models = getAllPlatformModels();
    res.json(models);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 创建平台模型
platformRouter.post('/models', (req, res) => {
  try {
    const { provider, modelName, priority } = req.body as CreatePlatformModelInput;
    if (!provider || !modelName) {
      return res.status(400).json({ error: 'provider, modelName are required' });
    }
    const created = createPlatformModel({ provider, modelName, priority });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 更新平台模型
platformRouter.patch('/models/:id', (req, res) => {
  try {
    const input = req.body as UpdatePlatformModelInput;
    const updated = updatePlatformModel(req.params.id, input);
    if (!updated) return res.status(404).json({ error: 'Model not found' });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 删除平台模型
platformRouter.delete('/models/:id', (req, res) => {
  try {
    const ok = deletePlatformModel(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Model not found' });
    res.json({ message: '模型已删除' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
