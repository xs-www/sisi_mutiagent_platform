import { getToolDefinition } from './registry.js';
import { executeToolImplementation } from './implementations.js';
import { createApprovalRequest, getApprovalRequest, updateApprovalStatus } from '../approval/repository.js';
import type { ToolResult, ToolExecutionResult, ApprovalRequiredResult } from './types.js';
import type { AgentConfig } from '../agent/types.js';

export async function executeTool(
  toolName: string,
  params: Record<string, any>,
  agentConfig: AgentConfig,
  ticketId: string,
  workspacePath: string,
  reason?: string
): Promise<ToolResult> {
  const startTime = Date.now();

  const definition = getToolDefinition(toolName);
  if (!definition) {
    return {
      success: false,
      output: '',
      error: `工具未定义: ${toolName}. 可用工具: ${agentConfig.tools.predefined.join(', ')}`,
      durationMs: Date.now() - startTime
    } as ToolExecutionResult;
  }

  if (!agentConfig.tools.predefined.includes(toolName)) {
    return {
      success: false,
      output: '',
      error: `Agent "${agentConfig.name}" 没有权限使用工具 "${toolName}". 已授权工具: ${agentConfig.tools.predefined.join(', ')}`,
      durationMs: Date.now() - startTime
    } as ToolExecutionResult;
  }

  const needsApprovalByPlatform = definition.approvalRequired;
  const needsApprovalByAgent = agentConfig.tools.approvalRequired?.includes(toolName);
  const needsApproval = needsApprovalByPlatform || needsApprovalByAgent;

  if (needsApproval) {
    const approval = createApprovalRequest({
      ticketId,
      agentId: agentConfig.id,
      toolName,
      params,
      reason: reason || `Agent "${agentConfig.name}" 请求使用工具 "${toolName}"`
    });

    const result: ApprovalRequiredResult = {
      requiresApproval: true,
      approvalId: approval.id,
      toolName,
      params,
      agentId: agentConfig.id,
      ticketId
    };
    return result;
  }

  return await executeToolImplementation(toolName, params, workspacePath);
}

export async function executeApprovedTool(
  approvalId: string,
  workspacePath: string,
  agentConfig: AgentConfig
): Promise<ToolExecutionResult> {
  const approval = getApprovalRequest(approvalId);
  if (!approval) {
    return { success: false, output: '', error: `审批请求不存在: ${approvalId}` };
  }
  if (approval.status !== 'approved') {
    return { success: false, output: '', error: `审批未通过，当前状态: ${approval.status}` };
  }

  return await executeToolImplementation(approval.toolName, JSON.parse(approval.params || '{}'), workspacePath);
}

export function rejectApproval(approvalId: string, userResponse?: string): boolean {
  return updateApprovalStatus(approvalId, 'rejected', userResponse);
}

export function approveApproval(approvalId: string, userResponse?: string): boolean {
  return updateApprovalStatus(approvalId, 'approved', userResponse);
}
