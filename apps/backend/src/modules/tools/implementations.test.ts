import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getTicketByIdMock } = vi.hoisted(() => ({
  getTicketByIdMock: vi.fn(),
}));

vi.mock('../ticket/repository.js', () => ({
  getTicketById: getTicketByIdMock,
  createTicket: vi.fn(),
  getMessagesByTicket: vi.fn(),
}));

import { resolveToolProjectId } from './implementations.js';

describe('resolveToolProjectId', () => {
  beforeEach(() => {
    getTicketByIdMock.mockReset();
  });

  it('prefers explicit projectId', () => {
    const projectId = resolveToolProjectId({ projectId: 'explicit-project' }, { workspacePath: 'x', ticketId: 'ticket-1', projectId: 'context-project' });
    expect(projectId).toBe('explicit-project');
  });

  it('falls back to context projectId', () => {
    const projectId = resolveToolProjectId({}, { workspacePath: 'x', ticketId: 'ticket-1', projectId: 'context-project' });
    expect(projectId).toBe('context-project');
  });

  it('falls back to ticket projectId', () => {
    getTicketByIdMock.mockReturnValue({ projectId: 'ticket-project' });

    const projectId = resolveToolProjectId({}, { workspacePath: 'x', ticketId: 'ticket-1' });

    expect(getTicketByIdMock).toHaveBeenCalledWith('ticket-1');
    expect(projectId).toBe('ticket-project');
  });
});
