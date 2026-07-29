export type AgentRole = 'supervisor' | 'specialist';

export interface AgentPrompt {
  system: string;
  personality?: string;
}

export interface AgentTools {
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
  prompt: AgentPrompt;
  tools: AgentTools;
  memory: AgentMemoryConfig;
  skills?: string[];
}

export interface Agent {
  id: string;
  name: string;
  config: AgentConfig;
  isBuiltIn: boolean;
}

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  supervisorId: string | null;
  workspacePath: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  agentId: string;
  joinedAt: string;
}

export type TicketType = 'task' | 'bug' | 'discussion' | 'decision';
export type TicketPriority = 'high' | 'medium' | 'low';
export type TicketStatus = 'pending' | 'in_progress' | 'reviewing' | 'completed';
export type MessageSenderType = 'user' | 'agent' | 'system';
export type MessageType = 'text' | 'thought' | 'action' | 'observation';

export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: string | null;
  createdBy: string;
  parentTicketId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Message {
  id: string;
  ticketId: string;
  senderType: MessageSenderType;
  senderId: string;
  content: string;
  messageType: MessageType;
  createdAt: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  ticketId: string;
  agentId: string;
  toolName: string;
  params: string;
  reason: string | null;
  status: ApprovalStatus;
  userResponse: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatResponse {
  model: string;
  message: ChatMessage;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  approvalRequired: boolean;
  params: ToolParam[];
}

export interface ToolParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

export interface ApprovalRequiredResult {
  requiresApproval: true;
  approvalId: string;
  toolName: string;
  params: Record<string, any>;
  agentId: string;
  ticketId: string;
}

export type ToolResult = ToolExecutionResult | ApprovalRequiredResult;

// API Key管理
export interface ApiKey {
  id: string;
  provider: string;
  name: string;
  apiKey: string; // 脱敏后的
  maxConcurrency: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  provider: string;
  name: string;
  apiKey: string;
  maxConcurrency?: number;
}

export interface UpdateApiKeyInput {
  provider?: string;
  name?: string;
  apiKey?: string;
  maxConcurrency?: number;
  isActive?: boolean;
}

// 平台模型池
export type PlatformProvider = 'ollama' | 'openai' | 'anthropic' | 'kimi' | 'qwen' | 'deepseek' | 'bailian';

export interface PlatformModel {
  id: string;
  provider: string;
  modelName: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlatformModelInput {
  provider: string;
  modelName: string;
  priority?: number;
}

export interface UpdatePlatformModelInput {
  provider?: string;
  modelName?: string;
  priority?: number;
  isActive?: boolean;
}

// Skill 包
export interface SkillPack {
  id: string;
  name: string;
  description: string;
  category: string;
  fileName: string;
  filePath: string;
  fileExt: 'zip' | 'skill';
  fileSize: number;
  importSource: 'upload' | 'legacy';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillPackInput {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateSkillPackInput {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}
