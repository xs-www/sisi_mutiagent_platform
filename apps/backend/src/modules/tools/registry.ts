import type { ToolDefinition } from './types.js';
import { getDb } from '../../db/index.js';

type CustomToolRow = {
  tool_name: string;
  description: string;
  category: string;
  approval_required: number | null;
  params_json: string;
  is_active: number | null;
};

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
  list_files: {
    name: 'list_files',
    description: '列出项目工作目录中的文件与子目录（不递归）',
    category: 'file',
    approvalRequired: false,
    params: [
      { name: 'path', type: 'string', required: false, description: '相对于项目工作目录的子路径，默认列出工作目录根' }
    ]
  },
  file_exists: {
    name: 'file_exists',
    description: '检查项目工作目录中的路径是否存在，并返回其类型（文件/目录）',
    category: 'file',
    approvalRequired: false,
    params: [
      { name: 'path', type: 'string', required: true, description: '相对于项目工作目录的文件或目录路径' }
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
  },
  get_project_members: {
    name: 'get_project_members',
    description: '获取当前项目组成员列表，用于任务分配与协作确认',
    category: 'project',
    approvalRequired: false,
    params: [
      { name: 'projectId', type: 'string', required: false, description: '项目ID，不传则使用当前上下文项目' }
    ]
  },
  create_ticket: {
    name: 'create_ticket',
    description: '在当前项目中发起新工单，并可指定项目成员作为指派对象',
    category: 'project',
    approvalRequired: false,
    params: [
      { name: 'projectId', type: 'string', required: false, description: '项目ID，不传则使用当前上下文项目' },
      { name: 'title', type: 'string', required: true, description: '工单标题' },
      { name: 'description', type: 'string', required: false, description: '工单描述' },
      { name: 'type', type: 'string', required: false, description: '工单类型，默认 task' },
      { name: 'priority', type: 'string', required: false, description: '优先级，默认 medium' },
      { name: 'assignee', type: 'string', required: false, description: '指派对象的 agentId 或名称' }
    ]
  }
};

function mapCustomRow(row: CustomToolRow): ToolDefinition {
  return {
    name: row.tool_name,
    description: row.description,
    category: row.category as ToolDefinition['category'],
    approvalRequired: !!row.approval_required,
    params: JSON.parse(row.params_json || '[]'),
  };
}

export function getCustomToolDefinitions(): ToolDefinition[] {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM custom_tools WHERE is_active = 1 ORDER BY created_at ASC').all() as CustomToolRow[];
    return rows.map(mapCustomRow);
  } catch {
    return [];
  }
}

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

// 从DB加载覆盖配置后的工具定义
export function getEffectiveToolDefinition(name: string): ToolDefinition | null {
  const base = TOOL_REGISTRY[name];
  if (base) {
    // 从DB加载覆盖
    try {
      const db = getDb();
      const row = db.prepare('SELECT * FROM tool_overrides WHERE tool_name = ?').get(name) as any;
      if (row) {
        return {
          ...base,
          approvalRequired: row.approval_required !== null ? !!row.approval_required : base.approvalRequired,
        };
      }
    } catch {
      // DB可能还没初始化
    }
    return base;
  }

  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM custom_tools WHERE tool_name = ? AND is_active = 1').get(name) as CustomToolRow | undefined;
    if (row) return mapCustomRow(row);
  } catch {
    // DB可能还没初始化
  }

  return null;
}

export function getAllEffectiveToolDefinitions(): ToolDefinition[] {
  const builtins = Object.keys(TOOL_REGISTRY).map(name => getEffectiveToolDefinition(name)!).filter(Boolean);
  const customs = getCustomToolDefinitions();
  const merged = [...builtins, ...customs];
  const seen = new Set<string>();
  return merged.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

export function createCustomToolDefinition(def: ToolDefinition): ToolDefinition {
  const db = getDb();
  db.prepare(`
    INSERT INTO custom_tools (tool_name, description, category, approval_required, params_json, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    ON CONFLICT(tool_name) DO UPDATE SET
      description = excluded.description,
      category = excluded.category,
      approval_required = excluded.approval_required,
      params_json = excluded.params_json,
      is_active = 1,
      updated_at = datetime('now')
  `).run(def.name, def.description, def.category, def.approvalRequired ? 1 : 0, JSON.stringify(def.params));
  return getEffectiveToolDefinition(def.name)!;
}

export function deleteCustomToolDefinition(toolName: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM custom_tools WHERE tool_name = ?').run(toolName);
  return result.changes > 0;
}

export function setToolOverride(toolName: string, approvalRequired?: boolean): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO tool_overrides (tool_name, approval_required, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(tool_name) DO UPDATE SET
      approval_required = COALESCE(excluded.approval_required, tool_overrides.approval_required),
      updated_at = datetime('now')
  `).run(toolName, approvalRequired === undefined ? null : (approvalRequired ? 1 : 0));
}
