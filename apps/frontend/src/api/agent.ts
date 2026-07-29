import { http } from './http';
import type { Agent } from '../types';

export async function getAgents(): Promise<Agent[]> {
  const resp = await http.get('/agents');
  return resp.data;
}

export async function getAgent(id: string): Promise<Agent> {
  const resp = await http.get(`/agents/${id}`);
  return resp.data;
}

export async function deleteAgent(id: string): Promise<void> {
  await http.delete(`/agents/${id}`);
}

export async function executeAgent(
  agentId: string,
  body: { ticketId: string; projectId?: string; maxIterations?: number; temperature?: number }
): Promise<{ ticketId: string; agentId: string; iterations: number; completed: boolean; error?: string }> {
  const resp = await http.post(`/agents/${agentId}/execute`, body);
  return resp.data;
}
