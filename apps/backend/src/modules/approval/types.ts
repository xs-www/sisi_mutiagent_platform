import type { ApprovalStatus } from '../../types/index.js';

export interface ApprovalRequest {
  id: string;
  ticketId: string;
  agentId: string;
  toolName: string;
  params: string;
  reason: string | null;
  status: ApprovalStatus;
  userResponse: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateApprovalInput {
  ticketId: string;
  agentId: string;
  toolName: string;
  params: Record<string, any>;
  reason?: string;
}
