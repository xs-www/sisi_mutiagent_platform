import { Router } from 'express';
import {
  getApprovalRequest, getApprovalsByTicket, getPendingApprovals,
  getApprovalsByAgent, updateApprovalStatus
} from './repository.js';
import type { ApprovalStatus } from '../../types/index.js';

export const approvalRouter = Router();

approvalRouter.get('/pending', (req, res) => {
  try {
    const approvals = getPendingApprovals();
    res.json(approvals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

approvalRouter.get('/ticket/:ticketId', (req, res) => {
  try {
    res.json(getApprovalsByTicket(req.params.ticketId));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

approvalRouter.get('/agent/:agentId', (req, res) => {
  try {
    res.json(getApprovalsByAgent(req.params.agentId));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

approvalRouter.get('/:id', (req, res) => {
  try {
    const approval = getApprovalRequest(req.params.id);
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    res.json(approval);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

approvalRouter.post('/:id/approve', (req, res) => {
  try {
    const ok = updateApprovalStatus(req.params.id, 'approved' as ApprovalStatus, req.body.userResponse);
    if (!ok) return res.status(404).json({ error: 'Approval not found' });
    res.json({ message: '已通过审批' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

approvalRouter.post('/:id/reject', (req, res) => {
  try {
    const ok = updateApprovalStatus(req.params.id, 'rejected' as ApprovalStatus, req.body.userResponse);
    if (!ok) return res.status(404).json({ error: 'Approval not found' });
    res.json({ message: '已拒绝审批' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
