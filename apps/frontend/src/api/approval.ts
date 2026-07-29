import { http } from './http';
import type { ApprovalRequest } from '../types';

export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  const resp = await http.get('/approvals/pending');
  return resp.data;
}

export async function getApproval(id: string): Promise<ApprovalRequest> {
  const resp = await http.get(`/approvals/${id}`);
  return resp.data;
}

export async function approveApproval(id: string, userResponse?: string): Promise<void> {
  await http.post(`/approvals/${id}/approve`, { userResponse });
}

export async function rejectApproval(id: string, userResponse?: string): Promise<void> {
  await http.post(`/approvals/${id}/reject`, { userResponse });
}

export async function getApprovalsByTicket(ticketId: string): Promise<ApprovalRequest[]> {
  const resp = await http.get(`/approvals/ticket/${ticketId}`);
  return resp.data;
}

export async function getApprovalsByAgent(agentId: string): Promise<ApprovalRequest[]> {
  const resp = await http.get(`/approvals/agent/${agentId}`);
  return resp.data;
}
