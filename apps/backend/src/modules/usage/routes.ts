// apps/backend/src/modules/usage/routes.ts
import { Router } from 'express';
import { getProjectUsageSummary, getAllProjectsUsageSummary } from './repository.js';

export const usageRouter = Router();

// 全平台按项目聚合的 Token 用量排行
usageRouter.get('/summary', (req, res) => {
  try {
    const summaries = getAllProjectsUsageSummary();
    res.json(summaries);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 单个项目的 Token 用量聚合
usageRouter.get('/projects/:projectId', (req, res) => {
  try {
    const summary = getProjectUsageSummary(req.params.projectId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
