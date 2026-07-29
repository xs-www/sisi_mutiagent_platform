import { http } from './http';
import type { Ticket, Message, TicketStatus } from '../types';

export async function getTicketsByProject(projectId: string): Promise<Ticket[]> {
  const resp = await http.get(`/tickets/project/${projectId}`);
  return resp.data;
}

export async function getTicket(id: string): Promise<Ticket> {
  const resp = await http.get(`/tickets/${id}`);
  return resp.data;
}

export async function createTicket(body: {
  projectId: string;
  title: string;
  description?: string;
  type: 'task' | 'bug' | 'discussion' | 'decision';
  priority?: 'high' | 'medium' | 'low';
  assigneeId?: string;
  createdBy: string;
  parentTicketId?: string;
}): Promise<Ticket> {
  const resp = await http.post('/tickets', body);
  return resp.data;
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
  const resp = await http.patch(`/tickets/${id}/status`, { status });
  return resp.data;
}

export async function assignTicket(id: string, agentId: string): Promise<Ticket> {
  const resp = await http.patch(`/tickets/${id}/assign`, { agentId });
  return resp.data;
}

export async function getMessages(ticketId: string): Promise<Message[]> {
  const resp = await http.get(`/tickets/${ticketId}/messages`);
  return resp.data;
}

export async function sendMessage(ticketId: string, body: {
  senderType: 'user' | 'agent' | 'system';
  senderId: string;
  content: string;
  messageType: 'text' | 'thought' | 'action' | 'observation';
}): Promise<Message> {
  const resp = await http.post(`/tickets/${ticketId}/messages`, body);
  return resp.data;
}

export async function deleteTicket(id: string): Promise<void> {
  await http.delete(`/tickets/${id}`);
}
