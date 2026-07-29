// apps/backend/src/types/index.ts

export type AgentRole = 'supervisor' | 'specialist';
export type TicketType = 'task' | 'bug' | 'discussion' | 'decision';
export type TicketPriority = 'high' | 'medium' | 'low';
export type TicketStatus = 'pending' | 'in_progress' | 'reviewing' | 'completed';
export type MessageSenderType = 'agent' | 'user' | 'system';
export type MessageType = 'text' | 'thought' | 'action' | 'observation';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type MemoryType = 'global' | 'project';
