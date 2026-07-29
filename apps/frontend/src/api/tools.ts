import { http } from './http';
import type { ToolDefinition, ToolExecutionResult, ToolResult } from '../types';

export async function getToolDefinitions(): Promise<ToolDefinition[]> {
  const resp = await http.get('/tools/definitions');
  return resp.data;
}

export async function getToolDefinition(name: string): Promise<ToolDefinition> {
  const resp = await http.get(`/tools/definitions/${name}`);
  return resp.data;
}

export async function executeToolDirect(body: {
  toolName: string;
  params: Record<string, any>;
  workspacePath: string;
}): Promise<ToolExecutionResult> {
  const resp = await http.post('/tools/execute-direct', body);
  return resp.data;
}

export async function executeTool(body: {
  agentId: string;
  projectId?: string;
  ticketId: string;
  toolName: string;
  params: Record<string, any>;
  reason?: string;
}): Promise<ToolResult> {
  const resp = await http.post('/tools/execute', body);
  return resp.data;
}

export async function executeApprovedTool(body: {
  approvalId: string;
  agentId: string;
  projectId?: string;
}): Promise<ToolExecutionResult> {
  const resp = await http.post('/tools/execute-approved', body);
  return resp.data;
}

export async function updateToolConfig(
  toolName: string,
  body: { approvalRequired?: boolean }
): Promise<ToolDefinition> {
  const resp = await http.patch(`/tools/definitions/${toolName}`, body);
  return resp.data;
}
