// apps/backend/src/modules/agent/types.ts

import type { AgentRole } from '../../types/index.js';

export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'kimi' | 'qwen' | 'deepseek';

export interface AgentModelConfig {
  provider: LLMProvider;
  name: string;
  apiKey?: string;
  fallback?: {
    provider: LLMProvider;
    name: string;
    apiKey?: string;
  };
}

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
  model: AgentModelConfig;
  prompt: AgentPromptConfig;
  tools: AgentToolsConfig;
  memory: AgentMemoryConfig;
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
