// apps/backend/src/modules/ticket/repository.ts
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { Ticket, Message, CreateTicketInput, CreateMessageInput, TicketStatusUpdate } from './types.js';

export function createTicket(input: CreateTicketInput): Ticket {
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO tickets (id, project_id, title, description, type, priority, status, assignee_id, created_by, parent_ticket_id)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(id, input.projectId, input.title, input.description, input.type, input.priority || 'medium', input.assigneeId || null, input.createdBy, input.parentTicketId || null);

  return getTicketById(id)!;
}

export function getTicketById(id: string): Ticket | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRowToTicket(row);
}

export function getTicketsByProject(projectId: string): Ticket[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tickets WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as any[];
  return rows.map(mapRowToTicket);
}

export function getTicketsByAssignee(agentId: string): Ticket[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tickets WHERE assignee_id = ? AND status != ? ORDER BY created_at DESC').all(agentId, 'completed') as any[];
  return rows.map(mapRowToTicket);
}

export function updateTicketStatus(id: string, status: TicketStatusUpdate): Ticket | null {
  const db = getDb();
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  db.prepare(`
    UPDATE tickets SET status = ?, updated_at = datetime('now'), completed_at = COALESCE(?, completed_at) WHERE id = ?
  `).run(status, completedAt, id);
  return getTicketById(id);
}

export function assignTicket(id: string, agentId: string): Ticket | null {
  const db = getDb();
  db.prepare('UPDATE tickets SET assignee_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(agentId, id);
  return getTicketById(id);
}

export function deleteTicket(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createMessage(input: CreateMessageInput): Message {
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO messages (id, ticket_id, sender_type, sender_id, content, message_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.ticketId, input.senderType, input.senderId, input.content, input.messageType);

  return getMessageById(id)!;
}

export function getMessageById(id: string): Message | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRowToMessage(row);
}

export function getMessagesByTicket(ticketId: string): Message[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId) as any[];
  return rows.map(mapRowToMessage);
}

function mapRowToTicket(row: any): Ticket {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    assigneeId: row.assignee_id,
    createdBy: row.created_by,
    parentTicketId: row.parent_ticket_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  };
}

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type,
    createdAt: row.created_at
  };
}
