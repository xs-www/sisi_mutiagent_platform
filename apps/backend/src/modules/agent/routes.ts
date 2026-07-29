// apps/backend/src/modules/agent/routes.ts
import { Router } from 'express';
import { getAgentFromDb, getAllAgentsFromDb, loadAgentConfig, createAgentConfig, deleteAgentConfig } from './loader.js';
import type { AgentConfig } from './types.js';

export const agentRouter = Router();

// 创建Agent
agentRouter.post('/', (req, res) => {
  try {
    const body = req.body as Partial<AgentConfig>;

    if (!body.id || !body.name || !body.role || !body.model || !body.prompt || !body.tools || !body.memory) {
      return res.status(400).json({ error: 'id, name, role, model, prompt, tools, memory are required' });
    }

    const agent = createAgentConfig(body as AgentConfig);
    res.status(201).json(agent);
  } catch (error: any) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除Agent
agentRouter.delete('/:id', (req, res) => {
  try {
    const success = deleteAgentConfig(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted' });
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// 触发Agent执行工单
agentRouter.post('/:id/execute', async (req, res) => {
  try {
    const agent = getAgentFromDb(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { ticketId, projectId, maxIterations, temperature } = req.body as {
      ticketId: string;
      projectId?: string;
      maxIterations?: number;
      temperature?: number;
    };

    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId is required' });
    }

    const { executeAgent } = await import('./executor.js');

    const result = await executeAgent(agent, ticketId, projectId, {
      maxIterations,
      temperature
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error executing agent:', error);
    res.status(500).json({ error: error.message });
  }
});
