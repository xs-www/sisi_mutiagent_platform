// apps/backend/src/modules/ticket/routes.ts
import { Router } from 'express';
import {
  createTicket, getTicketById, getTicketsByProject, getTicketsByParent,
  updateTicketStatus, assignTicket, deleteTicket as deleteTicketFn,
  createMessage, getMessagesByTicket
} from './repository.js';
import type { CreateTicketInput, CreateMessageInput } from './types.js';
import type { TicketType, TicketPriority, TicketStatus, MessageSenderType, MessageType } from '../../types/index.js';
import { resolveProjectAssignee } from '../project/repository.js';

export const ticketRouter = Router();

// 合法状态迁移约束
const VALID_STATUSES: TicketStatus[] = ['pending', 'in_progress', 'reviewing', 'completed', 'failed', 'blocked'];
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  pending: ['in_progress', 'failed', 'blocked'],
  in_progress: ['reviewing', 'completed', 'failed', 'blocked', 'pending'],
  reviewing: ['completed', 'in_progress', 'failed'],
  completed: ['pending'], // 终态，重开需先回 pending
  failed: ['pending', 'in_progress'], // 重置或重新执行
  blocked: ['in_progress', 'pending'], // 解除阻塞
};

function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

// Agent 代创建工单
ticketRouter.post('/from-agent', (req, res) => {
  try {
    const projectId = req.body.projectId as string;
    const title = req.body.title as string;
    const description = (req.body.description || '') as string;
    const type = req.body.type as TicketType;
    const priority = req.body.priority as TicketPriority;
    const assigneeHint = req.body.assignee as string | undefined;
    const createdBy = req.body.createdBy as string;
    const parentTicketId = req.body.parentTicketId as string | undefined;

    if (!projectId || !title || !type || !createdBy) {
      return res.status(400).json({ error: 'projectId, title, type, createdBy are required' });
    }

    const assignee = resolveProjectAssignee(projectId, assigneeHint);
    const ticket = createTicket({
      projectId,
      title,
      description,
      type,
      priority,
      assigneeId: assignee?.agentId,
      createdBy,
      parentTicketId,
    });

    res.status(201).json({
      ticket,
      resolvedAssignee: assignee || null,
    });
  } catch (error: any) {
    console.error('Error creating ticket from agent:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// 获取工单的子工单列表（注册在 GET /:id 之前，路径更具体优先匹配）
ticketRouter.get('/:id/children', (req, res) => {
  try {
    const children = getTicketsByParent(req.params.id);
    res.json(children);
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
ticketRouter.patch('/:id/status', async (req, res) => {
  try {
    const status = req.body.status as TicketStatus;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const current = getTicketById(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (current.status !== status && !isValidTransition(current.status, status)) {
      return res.status(400).json({ error: `不允许的状态迁移：${current.status} → ${status}` });
    }
    const ticket = await updateTicketStatus(req.params.id, status);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 分配工单
ticketRouter.patch('/:id/assign', async (req, res) => {
  try {
    const ticket = await assignTicket(req.params.id, req.body.agentId);
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
ticketRouter.post('/:id/messages', async (req, res) => {
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

    const message = await createMessage(input);
    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除工单
ticketRouter.delete('/:id', (req, res) => {
  try {
    const success = deleteTicketFn(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
