// apps/backend/src/modules/agent/types.ts

import type { AgentRole } from '../../types/index.js';

export interface AgentPromptConfig {
  system: string;
  personality?: string;
}

export interface AgentToolsConfig {
  predefined: string[];
  custom?: string[];
  approvalRequired?: string[];
}

export interface AgentMemoryConfig {
  global: boolean;
  project: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  prompt: AgentPromptConfig;
  tools: AgentToolsConfig;
  memory: AgentMemoryConfig;
  skills?: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  configPath: string;
  config: AgentConfig;
  createdAt: Date;
  updatedAt: Date;
}
