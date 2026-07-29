// apps/backend/src/modules/memory/types.ts
import type { MemoryType } from '../../types/index.js';

export interface AgentMemory {
  id: string;
  agentId: string;
  projectId: string | null;
  memoryType: MemoryType;
  content: string;
  createdAt: string;
}

export interface CreateMemoryInput {
  agentId: string;
  projectId?: string;
  memoryType: MemoryType;
  content: string;
}
