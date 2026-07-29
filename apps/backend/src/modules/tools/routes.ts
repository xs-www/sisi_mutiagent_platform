import { Router } from 'express';
import { getAllToolDefinitions, getToolDefinition } from './registry.js';
import { executeToolImplementation } from './implementations.js';
import { executeTool, executeApprovedTool, approveApproval, rejectApproval } from './executor.js';
import { getAgentFromDb } from '../agent/loader.js';
import { getProjectById } from '../project/repository.js';
import { isApprovalRequired } from './types.js';

export const toolRouter = Router();

toolRouter.get('/definitions', (req, res) => {
  res.json(getAllToolDefinitions());
});

toolRouter.get('/definitions/:name', (req, res) => {
  const def = getToolDefinition(req.params.name);
  if (!def) return res.status(404).json({ error: 'Tool not found' });
  res.json(def);
});

toolRouter.post('/execute-direct', async (req, res) => {
  try {
    const { toolName, params, workspacePath } = req.body as {
      toolName: string;
      params: Record<string, any>;
      workspacePath: string;
    };
    if (!toolName || !workspacePath) {
      return res.status(400).json({ error: 'toolName and workspacePath are required' });
    }
    const result = await executeToolImplementation(toolName, params || {}, workspacePath);
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

    const result = await executeTool(toolName, params || {}, agent.config, ticketId, workspacePath, reason);

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

    const result = await executeApprovedTool(approvalId, workspacePath || process.cwd(), agent.config);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
