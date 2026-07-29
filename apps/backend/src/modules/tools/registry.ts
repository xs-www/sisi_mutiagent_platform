import type { ToolDefinition } from './types.js';

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  file_read: {
    name: 'file_read',
    description: '读取项目工作目录中的文件内容',
    category: 'file',
    approvalRequired: false,
    params: [
      { name: 'path', type: 'string', required: true, description: '相对于项目工作目录的文件路径' }
    ]
  },
  file_write: {
    name: 'file_write',
    description: '写入文件内容到项目工作目录，文件不存在则创建，存在则覆盖',
    category: 'file',
    approvalRequired: false,
    params: [
      { name: 'path', type: 'string', required: true, description: '相对于项目工作目录的文件路径' },
      { name: 'content', type: 'string', required: true, description: '要写入的文件内容' }
    ]
  },
  file_delete: {
    name: 'file_delete',
    description: '删除项目工作目录中的文件（敏感操作，需审批）',
    category: 'file',
    approvalRequired: true,
    params: [
      { name: 'path', type: 'string', required: true, description: '相对于项目工作目录的文件路径' }
    ]
  },
  shell_execute: {
    name: 'shell_execute',
    description: '在项目工作目录中执行Shell命令（敏感操作，需审批）',
    category: 'shell',
    approvalRequired: true,
    params: [
      { name: 'command', type: 'string', required: true, description: '要执行的Shell命令' },
      { name: 'timeout_ms', type: 'number', required: false, description: '超时时间（毫秒），默认30000' }
    ]
  },
  http_request: {
    name: 'http_request',
    description: '发送HTTP请求获取外部资源',
    category: 'network',
    approvalRequired: false,
    params: [
      { name: 'url', type: 'string', required: true, description: '请求URL' },
      { name: 'method', type: 'string', required: false, description: 'HTTP方法（GET/POST等），默认GET' },
      { name: 'body', type: 'string', required: false, description: '请求体（POST/PUT时使用）' }
    ]
  },
  code_search: {
    name: 'code_search',
    description: '在项目工作目录中搜索代码，支持简单关键词匹配',
    category: 'code',
    approvalRequired: false,
    params: [
      { name: 'query', type: 'string', required: true, description: '搜索关键词（大小写不敏感）' },
      { name: 'path', type: 'string', required: false, description: '相对于工作目录的子路径，默认搜索全部' }
    ]
  },
  git_operation: {
    name: 'git_operation',
    description: '在项目工作目录中执行Git操作',
    category: 'git',
    approvalRequired: false,
    params: [
      { name: 'command', type: 'string', required: true, description: 'Git子命令（status/log/add/commit/push/pull等）' },
      { name: 'args', type: 'object', required: false, description: '命令参数数组' }
    ]
  }
};

export function getToolDefinition(name: string): ToolDefinition | null {
  return TOOL_REGISTRY[name] || null;
}

export function getAllToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY);
}

export function getApprovalRequiredTools(): string[] {
  return Object.values(TOOL_REGISTRY)
    .filter(t => t.approvalRequired)
    .map(t => t.name);
}
