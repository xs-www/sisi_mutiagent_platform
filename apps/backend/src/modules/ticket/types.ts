// apps/backend/src/modules/ticket/types.ts
import type { TicketType, TicketPriority, TicketStatus, MessageSenderType, MessageType } from '../../types/index.js';

export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: string | null;
  createdBy: string;
  parentTicketId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Message {
  id: string;
  ticketId: string;
  senderType: MessageSenderType;
  senderId: string;
  content: string;
  messageType: MessageType;
  createdAt: string;
}

export interface CreateTicketInput {
  projectId: string;
  title: string;
  description: string;
  type: TicketType;
  priority?: TicketPriority;
  assigneeId?: string;
  createdBy: string;
  parentTicketId?: string;
}

export interface CreateMessageInput {
  ticketId: string;
  senderType: MessageSenderType;
  senderId: string;
  content: string;
  messageType: MessageType;
}

export type TicketStatusUpdate = TicketStatus;
