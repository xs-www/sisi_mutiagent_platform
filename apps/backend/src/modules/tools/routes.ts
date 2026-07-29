import { Router } from 'express';
import { getAllEffectiveToolDefinitions, getEffectiveToolDefinition, setToolOverride, createCustomToolDefinition, deleteCustomToolDefinition } from './registry.js';
import { executeToolImplementation } from './implementations.js';
import { executeTool, executeApprovedTool, approveApproval, rejectApproval } from './executor.js';
import { getAgentFromDb } from '../agent/loader.js';
import { getProjectById } from '../project/repository.js';
import { isApprovalRequired } from './types.js';

export const toolRouter = Router();

toolRouter.get('/definitions', (req, res) => {
  res.json(getAllEffectiveToolDefinitions());
});

toolRouter.get('/definitions/:name', (req, res) => {
  const def = getEffectiveToolDefinition(req.params.name);
  if (!def) return res.status(404).json({ error: 'Tool not found' });
  res.json(def);
});

toolRouter.post('/definitions', (req, res) => {
  try {
    const { name, description, category, approvalRequired, params } = req.body as {
      name: string;
      description: string;
      category: string;
      approvalRequired?: boolean;
      params: Array<{ name: string; type: string; required?: boolean; description: string }>;
    };
    if (!name || !description || !category || !Array.isArray(params)) {
      return res.status(400).json({ error: 'name, description, category, params are required' });
    }
    const created = createCustomToolDefinition({
      name,
      description,
      category: category as any,
      approvalRequired: !!approvalRequired,
      params: params as any,
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

toolRouter.delete('/definitions/:name', (req, res) => {
  try {
    const ok = deleteCustomToolDefinition(req.params.name);
    if (!ok) return res.status(404).json({ error: 'Tool not found' });
    res.json({ message: 'Tool deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 更新工具配置覆盖（approvalRequired）
toolRouter.patch('/definitions/:name', (req, res) => {
  try {
    const { approvalRequired } = req.body as { approvalRequired?: boolean };
    const base = getEffectiveToolDefinition(req.params.name);
    if (!base) return res.status(404).json({ error: 'Tool not found' });
    setToolOverride(req.params.name, approvalRequired);
    res.json(getEffectiveToolDefinition(req.params.name));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

toolRouter.post('/execute-direct', async (req, res) => {
  try {
    const { toolName, params, workspacePath, projectId, ticketId } = req.body as {
      toolName: string;
      params: Record<string, any>;
      workspacePath: string;
      projectId?: string;
      ticketId?: string;
    };
    if (!toolName || !workspacePath) {
      return res.status(400).json({ error: 'toolName and workspacePath are required' });
    }
    const result = await executeToolImplementation(toolName, params || {}, workspacePath, {
      workspacePath,
      projectId,
      ticketId,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

toolRouter.post('/execute', async (req, res) => {
  try {
    const { agentId, projectId, ticketId, toolName, params, reason } = req.body as {
      agentId: string;
      projectId?: string;
      ticketId: string;
      toolName: string;
      params: Record<string, any>;
      reason?: string;
    };
    if (!agentId || !ticketId || !toolName) {
      return res.status(400).json({ error: 'agentId, ticketId, toolName are required' });
    }

    const agent = getAgentFromDb(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    let workspacePath: string = '';
    if (projectId) {
      const project = getProjectById(projectId);
      if (project) workspacePath = project.workspacePath;
    }
    if (!workspacePath) {
      workspacePath = require('path').join(process.cwd(), 'temp_workspace');
      require('fs').mkdirSync(workspacePath, { recursive: true });
    }

    const result = await executeTool(toolName, params || {}, agent.config, ticketId, workspacePath, {
      projectId,
      agentName: agent.name,
    }, reason);

    if (isApprovalRequired(result)) {
      return res.status(202).json(result);
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

toolRouter.post('/execute-approved', async (req, res) => {
  try {
    const { approvalId, agentId, projectId } = req.body as {
      approvalId: string;
      agentId: string;
      projectId?: string;
    };
    if (!approvalId || !agentId) {
      return res.status(400).json({ error: 'approvalId and agentId are required' });
    }
    const agent = getAgentFromDb(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    let workspacePath: string = '';
    if (projectId) {
      const project = getProjectById(projectId);
      if (project) workspacePath = project.workspacePath;
    }

    const result = await executeApprovedTool(approvalId, workspacePath || process.cwd(), agent.config, {
      projectId,
      agentName: agent.name,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
