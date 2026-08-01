import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../ticket/types.js';

const mocks = vi.hoisted(() => ({
  createMessageMock: vi.fn(),
  getTicketByIdMock: vi.fn(),
  getAgentFromDbMock: vi.fn(),
  getProjectMembersMock: vi.fn(),
  executeAgentMock: vi.fn(),
}));

vi.mock('../ticket/repository.js', () => ({
  createMessage: mocks.createMessageMock,
  getTicketById: mocks.getTicketByIdMock,
}));

vi.mock('./loader.js', () => ({
  getAgentFromDb: mocks.getAgentFromDbMock,
}));

vi.mock('../project/repository.js', () => ({
  getProjectMember: vi.fn(),
  getProjectMembers: mocks.getProjectMembersMock,
}));

vi.mock('./executor.js', () => ({
  executeAgent: mocks.executeAgentMock,
}));

import { dispatchChildTicketExecution } from './orchestration.js';

describe('dispatchChildTicketExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeAgentMock.mockResolvedValue({ completed: true });
  });

  it('dispatches execution when the assignee is a valid project member', async () => {
    const createdTicket: Ticket = {
      id: 'child-ticket',
      projectId: 'project-1',
      title: '子工单',
      description: '',
      type: 'task',
      priority: 'medium',
      status: 'pending',
      assigneeId: 'writer-agent',
      createdBy: 'supervisor-agent',
      parentTicketId: 'parent-ticket',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    mocks.getTicketByIdMock.mockImplementation((id: string) => {
      if (id === 'child-ticket') return createdTicket;
      if (id === 'parent-ticket') {
        return {
          ...createdTicket,
          id: 'parent-ticket',
          assigneeId: 'supervisor-agent',
          parentTicketId: null,
        };
      }
      return null;
    });

    mocks.getAgentFromDbMock.mockReturnValue({
      id: 'writer-agent',
      name: 'writer',
      role: 'writer',
      config: { id: 'writer-agent', name: 'writer', role: 'writer', prompt: { system: '' }, tools: { predefined: [] }, memory: { global: false, project: false } },
    });
    mocks.getProjectMembersMock.mockReturnValue([{ agentId: 'writer-agent' }, { agentId: 'supervisor-agent' }]);

    const result = await dispatchChildTicketExecution({
      parentTicketId: 'parent-ticket',
      createdTicket,
      projectId: 'project-1',
      triggerAgentId: 'supervisor-agent',
      triggerAgentName: 'supervisor',
    });

    expect(result.started).toBe(true);
    expect(mocks.executeAgentMock).toHaveBeenCalledOnce();
    expect(result.assigneeId).toBe('writer-agent');
  });

  it('skips execution when the assignee would create a circular chain', async () => {
    const createdTicket: Ticket = {
      id: 'child-ticket',
      projectId: 'project-1',
      title: '子工单',
      description: '',
      type: 'task',
      priority: 'medium',
      status: 'pending',
      assigneeId: 'writer-agent',
      createdBy: 'supervisor-agent',
      parentTicketId: 'parent-ticket',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    mocks.getTicketByIdMock.mockImplementation((id: string) => {
      if (id === 'child-ticket') return createdTicket;
      if (id === 'parent-ticket') {
        return {
          ...createdTicket,
          id: 'parent-ticket',
          assigneeId: 'writer-agent',
          parentTicketId: null,
        };
      }
      return null;
    });

    mocks.getAgentFromDbMock.mockReturnValue({
      id: 'writer-agent',
      name: 'writer',
      role: 'writer',
      config: { id: 'writer-agent', name: 'writer', role: 'writer', prompt: { system: '' }, tools: { predefined: [] }, memory: { global: false, project: false } },
    });
    mocks.getProjectMembersMock.mockReturnValue([{ agentId: 'writer-agent' }]);

    const result = await dispatchChildTicketExecution({
      parentTicketId: 'parent-ticket',
      createdTicket,
      projectId: 'project-1',
      triggerAgentId: 'supervisor-agent',
      triggerAgentName: 'supervisor',
    });

    expect(result.started).toBe(false);
    expect(result.reason).toContain('循环');
    expect(mocks.executeAgentMock).not.toHaveBeenCalled();
  });
});
