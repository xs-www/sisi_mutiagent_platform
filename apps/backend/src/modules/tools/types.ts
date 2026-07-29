export interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  description: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'file' | 'shell' | 'network' | 'git' | 'code' | 'project' | 'custom';
  approvalRequired: boolean;
  params: ToolParam[];
}

export interface ToolExecutionContext {
  workspacePath: string;
  projectId?: string;
  ticketId?: string;
  agentId?: string;
  agentName?: string;
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

export function isApprovalRequired(result: ToolResult): result is ApprovalRequiredResult {
  return (result as ApprovalRequiredResult).requiresApproval === true;
}
