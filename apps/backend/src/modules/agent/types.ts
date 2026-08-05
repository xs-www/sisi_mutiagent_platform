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

export interface AgentInstructions {
  goal?: string;
  constraints?: string;
  methods?: string;
  outputFormat?: string;
  refusalStrategy?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  role: AgentRole;
  prompt: AgentPromptConfig;
  tools: AgentToolsConfig;
  memory: AgentMemoryConfig;
  skills?: string[];
  instructions?: AgentInstructions;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  configPath: string;
  config: AgentConfig;
  /** 是否内置 Agent（存放于 data/agents/builtin 命名空间） */
  isBuiltin: boolean;
  createdAt: Date;
  updatedAt: Date;
}
