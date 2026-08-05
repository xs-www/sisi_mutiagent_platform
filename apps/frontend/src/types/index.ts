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
  prompt: AgentPrompt;
  tools: AgentTools;
  memory: AgentMemoryConfig;
  skills?: string[];
  instructions?: AgentInstructions;
}

export interface Agent {
  id: string;
  name: string;
  config: AgentConfig;
  isBuiltin: boolean;
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
export type TicketStatus = 'pending' | 'in_progress' | 'reviewing' | 'completed' | 'failed' | 'blocked';
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

// ===== Agent 执行事件（SSE 流式，镜像后端 events.ts）=====
export type AgentEventType =
  | 'start'
  | 'iteration_start'
  | 'thought'
  | 'action'
  | 'observation'
  | 'message'
  | 'ticket_status'
  | 'child_dispatched'
  | 'supervision'
  | 'complete'
  | 'error';

export interface AgentEventBase {
  type: AgentEventType;
  timestamp: string;
  /** 当事件来自子工单执行（同步串行透传）时，标识子工单，前端据此区分渲染 */
  childTicketId?: string;
  childTicketTitle?: string;
}

export interface StartEvent extends AgentEventBase {
  type: 'start';
  agentId: string;
  agentName: string;
}

export interface IterationStartEvent extends AgentEventBase {
  type: 'iteration_start';
  iteration: number;
}

export interface StepEvent extends AgentEventBase {
  type: 'thought' | 'action' | 'observation' | 'message';
  iteration: number;
  messageId: string;
  content: string;
  createdAt: string;
  senderType?: 'agent' | 'system';
}

export interface TicketStatusEvent extends AgentEventBase {
  type: 'ticket_status';
  status: TicketStatus;
  reason?: string;
}

export interface ChildDispatchedEvent extends AgentEventBase {
  type: 'child_dispatched';
  childTicketId: string;
  childTicketTitle: string;
  assigneeId: string;
  assigneeName?: string;
}

export interface CompleteEvent extends AgentEventBase {
  type: 'complete';
  iterations: number;
  completed: boolean;
  finalActionType?: string;
}

export interface ErrorEvent extends AgentEventBase {
  type: 'error';
  error: string;
  iterations: number;
}

export interface SupervisionEvent extends AgentEventBase {
  type: 'supervision';
  iteration: number;
  decision: 'continue' | 'retry' | 'review' | 'terminate';
  reason: string;
  suggestion: string;
  messageId: string;
  createdAt: string;
}

export type AgentEvent =
  | StartEvent
  | IterationStartEvent
  | StepEvent
  | TicketStatusEvent
  | ChildDispatchedEvent
  | SupervisionEvent
  | CompleteEvent
  | ErrorEvent;

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
  categories: string[];
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  provider: string;
  name: string;
  apiKey: string;
  maxConcurrency?: number;
  categories?: string[];
  models?: string[];
}

export interface UpdateApiKeyInput {
  provider?: string;
  name?: string;
  apiKey?: string;
  maxConcurrency?: number;
  isActive?: boolean;
  categories?: string[];
  models?: string[];
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
