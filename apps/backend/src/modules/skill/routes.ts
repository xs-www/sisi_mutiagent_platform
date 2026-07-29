import { Router } from 'express';
import {
  createSkillPack, getAllSkillPacks, getSkillPackById,
  updateSkillPack, deleteSkillPack,
} from './repository.js';
import type { CreateSkillPackInput, UpdateSkillPackInput } from './types.js';

export const skillRouter = Router();

// 获取所有 Skill 包
skillRouter.get('/', (req, res) => {
  try {
    const skills = getAllSkillPacks();
    res.json(skills);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 获取单个 Skill 包
skillRouter.get('/:id', (req, res) => {
  try {
    const skill = getSkillPackById(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill pack not found' });
    res.json(skill);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 导入（创建）Skill 包
skillRouter.post('/', (req, res) => {
  try {
    const { name, description, category, content } = req.body as CreateSkillPackInput;
    if (!name || !content) {
      return res.status(400).json({ error: 'name, content are required' });
    }
    const created = createSkillPack({ name, description, category, content });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 更新 Skill 包
skillRouter.patch('/:id', (req, res) => {
  try {
    const input = req.body as UpdateSkillPackInput;
    const updated = updateSkillPack(req.params.id, input);
    if (!updated) return res.status(404).json({ error: 'Skill pack not found' });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 删除 Skill 包
skillRouter.delete('/:id', (req, res) => {
  try {
    const ok = deleteSkillPack(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Skill pack not found' });
    res.json({ message: 'Skill pack deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
