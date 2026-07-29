import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { ApprovalRequest, CreateApprovalInput } from './types.js';
import type { ApprovalStatus } from '../../types/index.js';

export function createApprovalRequest(input: CreateApprovalInput): ApprovalRequest {
  const db = getDb();
  const id = uuidv4();
  const paramsJson = JSON.stringify(input.params || {});

  db.prepare(`
    INSERT INTO approval_requests (id, ticket_id, agent_id, tool_name, params, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, input.ticketId, input.agentId, input.toolName, paramsJson, input.reason || null);

  return getApprovalRequest(id)!;
}

export function getApprovalRequest(id: string): ApprovalRequest | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getApprovalsByTicket(ticketId: string): ApprovalRequest[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM approval_requests WHERE ticket_id = ? ORDER BY created_at DESC').all(ticketId) as any[];
  return rows.map(mapRow);
}

export function getPendingApprovals(): ApprovalRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM approval_requests WHERE status = 'pending' ORDER BY created_at DESC").all() as any[];
  return rows.map(mapRow);
}

export function getApprovalsByAgent(agentId: string): ApprovalRequest[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM approval_requests WHERE agent_id = ? ORDER BY created_at DESC').all(agentId) as any[];
  return rows.map(mapRow);
}

export function updateApprovalStatus(
  id: string,
  status: ApprovalStatus,
  userResponse?: string
): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE approval_requests
    SET status = ?, user_response = ?, resolved_at = datetime('now')
    WHERE id = ?
  `).run(status, userResponse || null, id);
  return result.changes > 0;
}

function mapRow(row: any): ApprovalRequest {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    agentId: row.agent_id,
    toolName: row.tool_name,
    params: row.params,
    reason: row.reason,
    status: row.status,
    userResponse: row.user_response,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at
  };
}
