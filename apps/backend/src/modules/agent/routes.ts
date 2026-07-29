// apps/backend/src/modules/agent/routes.ts
import { Router } from 'express';
import { getAgentFromDb, getAllAgentsFromDb, loadAgentConfig } from './loader.js';

export const agentRouter = Router();

// 获取所有Agent
agentRouter.get('/', (req, res) => {
  try {
    const agents = getAllAgentsFromDb();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// 获取单个Agent
agentRouter.get('/:id', (req, res) => {
  try {
    const agent = getAgentFromDb(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// 获取Agent配置详情
agentRouter.get('/:id/config', (req, res) => {
  try {
    const config = loadAgentConfig(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'Agent config not found' });
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching agent config:', error);
    res.status(500).json({ error: 'Failed to fetch agent config' });
  }
});
