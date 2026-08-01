// apps/backend/src/modules/ticket/repository.ts
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getProjectTicketsDir } from '../project/repository.js';
import type { Ticket, Message, CreateTicketInput, CreateMessageInput, TicketStatusUpdate } from './types.js';

interface TicketDocument {
  ticket: Ticket;
  messages: Message[];
  updatedAt: string;
}

// ---- per-ticket 写入互斥锁 ----
// 现状 createMessage/updateTicketStatus/assignTicket 内部为同步 fs 操作，单线程下天然原子；
// 但异步并发场景下（父工单 ReAct 循环与子工单队列回写同一父工单），若未来将 fs 改为异步，
// "读-改-写" 将在 await 点交错导致消息丢失。此处用 Promise 链式锁串行化同一工单的写操作。
const ticketLocks = new Map<string, Promise<unknown>>();

function withTicketLock<T>(ticketId: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = ticketLocks.get(ticketId) ?? Promise.resolve();
  const next = prev.then(async () => {
    try {
      return await fn();
    } finally {
      // 当本任务仍是链尾时清理，避免 Map 无限增长
      if (ticketLocks.get(ticketId) === next) {
        ticketLocks.delete(ticketId);
      }
    }
  });
  ticketLocks.set(ticketId, next);
  return next;
}

function sanitizeTicketName(title: string): string {
  const safe = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return safe || 'untitled_ticket';
}

function readTicketOwnerId(filePath: string): string | undefined {
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as any;
    return parsed?.ticket?.id;
  } catch {
    return undefined;
  }
}

function findTicketDocumentPath(projectId: string, ticketId: string): string | null {
  const ticketDir = getProjectTicketsDir(projectId);
  if (!existsSync(ticketDir)) return null;

  const files = readdirSync(ticketDir)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of files) {
    const fullPath = join(ticketDir, fileName);
    if (readTicketOwnerId(fullPath) === ticketId) {
      return fullPath;
    }
  }

  const legacyPath = join(ticketDir, `${ticketId}.json`);
  if (existsSync(legacyPath)) return legacyPath;
  return null;
}

function resolveTicketFilePathForWrite(ticket: Ticket): string {
  const ticketDir = getProjectTicketsDir(ticket.projectId);
  mkdirSync(ticketDir, { recursive: true });

  const existingPath = findTicketDocumentPath(ticket.projectId, ticket.id);
  const baseName = sanitizeTicketName(ticket.title);

  let candidateName = `${baseName}.json`;
  let candidatePath = join(ticketDir, candidateName);
  let index = 2;

  while (existsSync(candidatePath)) {
    if (candidatePath === existingPath) {
      break;
    }

    const ownerId = readTicketOwnerId(candidatePath);
    if (ownerId === ticket.id) {
      break;
    }

    candidateName = `${baseName}_${index}.json`;
    candidatePath = join(ticketDir, candidateName);
    index += 1;
  }

  if (existingPath && existingPath !== candidatePath && existsSync(existingPath)) {
    renameSync(existingPath, candidatePath);
  }

  return candidatePath;
}

function writeTicketDocument(document: TicketDocument): void {
  const filePath = resolveTicketFilePathForWrite(document.ticket);
  writeFileSync(filePath, JSON.stringify(document, null, 2), 'utf-8');
}

function readTicketDocument(projectId: string, ticketId: string): TicketDocument | null {
  const filePath = findTicketDocumentPath(projectId, ticketId);
  if (!filePath || !existsSync(filePath)) return null;

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as TicketDocument;
    if (!parsed?.ticket?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getTicketRowById(ticketId: string): any | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
  return row || null;
}

function hydrateTicketFromRow(row: any): Ticket {
  const baseTicket = mapRowToTicket(row);
  const doc = readTicketDocument(baseTicket.projectId, baseTicket.id);
  return doc?.ticket || baseTicket;
}

function upsertTicketIndexFromDocument(ticket: Ticket): void {
  const db = getDb();
  db.prepare(`
    UPDATE tickets
    SET title = ?, description = ?, type = ?, priority = ?, status = ?, assignee_id = ?,
        created_by = ?, parent_ticket_id = ?, updated_at = datetime('now'), completed_at = ?
    WHERE id = ?
  `).run(
    ticket.title,
    '',
    ticket.type,
    ticket.priority,
    ticket.status,
    ticket.assigneeId || null,
    ticket.createdBy,
    ticket.parentTicketId || null,
    ticket.completedAt,
    ticket.id
  );
}

export function createTicket(input: CreateTicketInput): Ticket {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const ticket: Ticket = {
    id,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    type: input.type,
    priority: input.priority || 'medium',
    status: 'pending',
    assigneeId: input.assigneeId || null,
    createdBy: input.createdBy,
    parentTicketId: input.parentTicketId || null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  db.prepare(`
    INSERT INTO tickets (id, project_id, title, description, type, priority, status, assignee_id, created_by, parent_ticket_id)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(
    id,
    input.projectId,
    input.title,
    '',
    input.type,
    input.priority || 'medium',
    input.assigneeId || null,
    input.createdBy,
    input.parentTicketId || null
  );

  writeTicketDocument({
    ticket,
    messages: [],
    updatedAt: now,
  });

  return ticket;
}

export function getTicketById(id: string): Ticket | null {
  const row = getTicketRowById(id);
  if (!row) return null;
  return hydrateTicketFromRow(row);
}

export function getTicketsByProject(projectId: string): Ticket[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tickets WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as any[];
  return rows.map(hydrateTicketFromRow);
}

export function getTicketsByAssignee(agentId: string): Ticket[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tickets WHERE assignee_id = ? AND status != ? ORDER BY created_at DESC').all(agentId, 'completed') as any[];
  return rows.map(hydrateTicketFromRow);
}

export function getTicketsByParent(parentId: string): Ticket[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tickets WHERE parent_ticket_id = ? ORDER BY created_at ASC').all(parentId) as any[];
  return rows.map(hydrateTicketFromRow);
}

function updateTicketStatusUnsafe(id: string, status: TicketStatusUpdate): Ticket | null {
  const row = getTicketRowById(id);
  if (!row) return null;

  const current = hydrateTicketFromRow(row);
  const next: Ticket = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : current.completedAt,
  };

  writeTicketDocument({
    ticket: next,
    messages: getMessagesByTicket(id),
    updatedAt: next.updatedAt,
  });
  upsertTicketIndexFromDocument(next);
  return next;
}

export function updateTicketStatus(id: string, status: TicketStatusUpdate): Promise<Ticket | null> {
  return withTicketLock(id, () => updateTicketStatusUnsafe(id, status));
}

function assignTicketUnsafe(id: string, agentId: string): Ticket | null {
  const row = getTicketRowById(id);
  if (!row) return null;

  const current = hydrateTicketFromRow(row);
  const next: Ticket = {
    ...current,
    assigneeId: agentId,
    updatedAt: new Date().toISOString(),
  };

  writeTicketDocument({
    ticket: next,
    messages: getMessagesByTicket(id),
    updatedAt: next.updatedAt,
  });
  upsertTicketIndexFromDocument(next);
  return next;
}

export function assignTicket(id: string, agentId: string): Promise<Ticket | null> {
  return withTicketLock(id, () => assignTicketUnsafe(id, agentId));
}

export function deleteTicket(id: string): boolean {
  const db = getDb();
  const row = getTicketRowById(id);
  if (row) {
    const ticket = mapRowToTicket(row);
    const filePath = findTicketDocumentPath(ticket.projectId, ticket.id);
    if (filePath && existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  db.prepare('DELETE FROM messages WHERE ticket_id = ?').run(id);
  const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
  return result.changes > 0;
}

function createMessageUnsafe(input: CreateMessageInput): Message {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const message: Message = {
    id,
    ticketId: input.ticketId,
    senderType: input.senderType,
    senderId: input.senderId,
    content: input.content,
    messageType: input.messageType,
    createdAt: now,
  };

  const ticket = getTicketById(input.ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${input.ticketId} not found`);
  }

  const currentDoc = readTicketDocument(ticket.projectId, ticket.id);
  const nextMessages = [...(currentDoc?.messages || []), message];
  writeTicketDocument({
    ticket: currentDoc?.ticket || ticket,
    messages: nextMessages,
    updatedAt: new Date().toISOString(),
  });

  db.prepare(`
    INSERT INTO messages (id, ticket_id, sender_type, sender_id, content, message_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.ticketId, input.senderType, input.senderId, '[stored_in_project_files]', input.messageType);

  return message;
}

export function createMessage(input: CreateMessageInput): Promise<Message> {
  return withTicketLock(input.ticketId, () => createMessageUnsafe(input));
}

export function getMessageById(id: string): Message | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
  if (!row) return null;

  const ticket = getTicketById(row.ticket_id);
  if (!ticket) return mapRowToMessage(row);

  const doc = readTicketDocument(ticket.projectId, ticket.id);
  const matched = doc?.messages.find((item) => item.id === id);
  return matched || mapRowToMessage(row);
}

export function getMessagesByTicket(ticketId: string): Message[] {
  const ticket = getTicketById(ticketId);
  if (!ticket) return [];

  const doc = readTicketDocument(ticket.projectId, ticket.id);
  if (doc?.messages) {
    return doc.messages;
  }

  const db = getDb();
  const rows = db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId) as any[];
  return rows.map(mapRowToMessage);
}

export function migrateTicketPayloadsToProjectFiles(): void {
  const db = getDb();
  const ticketRows = db.prepare('SELECT * FROM tickets').all() as any[];

  for (const row of ticketRows) {
    const ticket = mapRowToTicket(row);
    const existing = readTicketDocument(ticket.projectId, ticket.id);
    const messageRows = db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id) as any[];

    writeTicketDocument({
      ticket: existing?.ticket || ticket,
      messages: existing?.messages || messageRows.map(mapRowToMessage),
      updatedAt: new Date().toISOString(),
    });

    if ((row.description || '').length > 0) {
      db.prepare('UPDATE tickets SET description = ? WHERE id = ?').run('', ticket.id);
    }

    db.prepare('UPDATE messages SET content = ? WHERE ticket_id = ? AND content != ?')
      .run('[stored_in_project_files]', ticket.id, '[stored_in_project_files]');
  }
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
