// apps/backend/src/modules/agent/events.ts
// Agent 执行过程中的事件类型定义，供 SSE 流式推送与异步队列复用。
// 每个 thought/action/observation 事件携带 createMessage 返回的真实 messageId，
// 前端流结束后用 loadMessages() 按此 id 去重，避免闪烁。
import type { TicketStatus } from '../../types/index.js';

export type AgentEventType =
  | 'start'
  | 'iteration_start'
  | 'thought'
  | 'action'
  | 'observation'
  | 'message' // 系统文本消息（如"Agent 开始处理"）
  | 'ticket_status'
  | 'child_dispatched'
  | 'supervision' // 监督事件（continue/retry/review/terminate）
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

export type SupervisionDecision = 'continue' | 'retry' | 'review' | 'terminate';

export interface SupervisionEvent extends AgentEventBase {
  type: 'supervision';
  iteration: number;
  decision: SupervisionDecision;
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

// 执行取消信号（用 AbortController.signal 即可，这里给出最小接口便于不依赖 DOM 类型）
export interface ExecutionSignal {
  readonly aborted: boolean;
}
