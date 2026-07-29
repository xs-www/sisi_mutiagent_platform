import { describe, expect, it } from 'vitest';
import { parseAgentResponse } from './action-parser.js';

describe('parseAgentResponse', () => {
  it('parses tool_call with a project tool name', () => {
    const result = parseAgentResponse(`Thought: 先读取项目成员
Action: tool_call(get_project_members, {})`);

    expect(result.type).toBe('tool_call');
    expect(result.toolName).toBe('get_project_members');
    expect(result.toolParams).toEqual({});
  });

  it('parses tool_call with JSON params', () => {
    const result = parseAgentResponse(`Thought: 创建工单
Action: tool_call(create_ticket, {"title":"修复问题","description":"处理失败分支"})`);

    expect(result.type).toBe('tool_call');
    expect(result.toolName).toBe('create_ticket');
    expect(result.toolParams).toEqual({ title: '修复问题', description: '处理失败分支' });
  });

  it('parses quoted tool names', () => {
    const result = parseAgentResponse(`Thought: 继续执行
Action: tool_call("get_project_members", {})`);

    expect(result.type).toBe('tool_call');
    expect(result.toolName).toBe('get_project_members');
  });

  it('parses create_ticket with equals syntax', () => {
    const result = parseAgentResponse(`Thought: 创建工单
Action: create_ticket(projectId="a0f2586d-8415-4be5-9973-d985bd838ecc", title="撰写中国AI最新进展综合科普短文", description="内容简介", type="task", assignee="writer")`);

    expect(result.type).toBe('create_ticket');
    expect(result.ticketTitle).toBe('撰写中国AI最新进展综合科普短文');
    expect(result.ticketAssignee).toBe('writer');
  });
});
