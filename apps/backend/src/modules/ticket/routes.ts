// apps/backend/src/modules/ticket/routes.ts
import { Router } from 'express';
import {
  createTicket, getTicketById, getTicketsByProject,
  updateTicketStatus, assignTicket,
  createMessage, getMessagesByTicket
} from './repository.js';
import type { CreateTicketInput, CreateMessageInput } from './types.js';
import type { TicketType, TicketPriority, TicketStatus, MessageSenderType, MessageType } from '../../types/index.js';

export const ticketRouter = Router();

// 创建工单
ticketRouter.post('/', (req, res) => {
  try {
    const input: CreateTicketInput = {
      projectId: req.body.projectId,
      title: req.body.title,
      description: req.body.description || '',
      type: req.body.type as TicketType,
      priority: req.body.priority as TicketPriority,
      assigneeId: req.body.assigneeId,
      createdBy: req.body.createdBy,
      parentTicketId: req.body.parentTicketId
    };

    if (!input.projectId || !input.title || !input.type || !input.createdBy) {
      return res.status(400).json({ error: 'projectId, title, type, createdBy are required' });
    }

    const ticket = createTicket(input);
    res.status(201).json(ticket);
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取项目下所有工单
ticketRouter.get('/project/:projectId', (req, res) => {
  try {
    const tickets = getTicketsByProject(req.params.projectId);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个工单
ticketRouter.get('/:id', (req, res) => {
  try {
    const ticket = getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新工单状态
ticketRouter.patch('/:id/status', (req, res) => {
  try {
    const status = req.body.status as TicketStatus;
    if (!['pending', 'in_progress', 'reviewing', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const ticket = updateTicketStatus(req.params.id, status);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 分配工单
ticketRouter.patch('/:id/assign', (req, res) => {
  try {
    const ticket = assignTicket(req.params.id, req.body.agentId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取工单消息列表
ticketRouter.get('/:id/messages', (req, res) => {
  try {
    const messages = getMessagesByTicket(req.params.id);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 发送消息到工单
ticketRouter.post('/:id/messages', (req, res) => {
  try {
    const input: CreateMessageInput = {
      ticketId: req.params.id,
      senderType: req.body.senderType as MessageSenderType,
      senderId: req.body.senderId,
      content: req.body.content,
      messageType: req.body.messageType as MessageType
    };

    if (!input.senderId || !input.content) {
      return res.status(400).json({ error: 'senderId and content are required' });
    }

    const message = createMessage(input);
    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
