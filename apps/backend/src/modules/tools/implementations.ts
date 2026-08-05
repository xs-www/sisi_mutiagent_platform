import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, normalize, isAbsolute } from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import type { ToolExecutionResult } from './types.js';
import type { ToolExecutionContext } from './types.js';
import { getProjectMemberProfiles, resolveProjectAssignee } from '../project/repository.js';
import { createTicket } from '../ticket/repository.js';
import { getTicketById } from '../ticket/repository.js';
import { dispatchChildTicketExecution } from '../agent/orchestration.js';

// ========== 安全工具：路径检查 ==========
function resolveSafePath(workspacePath: string, userPath: string): { error?: string; path?: string } {
  // 禁止绝对路径，必须是相对路径
  if (isAbsolute(userPath)) {
    return { error: '不允许使用绝对路径，请使用相对于项目工作目录的路径' };
  }

  // 规范化路径，解析../
  const normalized = normalize(userPath);

  // 禁止跳出工作目录
  if (normalized.startsWith('..')) {
    return { error: '不允许访问项目工作目录之外的路径' };
  }

  const fullPath = join(workspacePath, normalized);

  // 双重检查：最终路径必须在workspacePath下
  const realWorkspace = normalize(workspacePath);
  if (!fullPath.startsWith(realWorkspace + '\\') && !fullPath.startsWith(realWorkspace + '/') && fullPath !== realWorkspace) {
    return { error: '路径超出工作目录范围，已阻止' };
  }

  return { path: fullPath };
}

// ========== 文件工具 ==========

export function toolFileRead(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const userPath = params.path as string;
  if (!userPath) return { success: false, output: '', error: '缺少必填参数: path' };

  const safe = resolveSafePath(workspacePath, userPath);
  if (safe.error) return { success: false, output: '', error: safe.error, durationMs: Date.now() - startTime };
  if (!safe.path) return { success: false, output: '', error: '路径解析失败' };

  if (!existsSync(safe.path)) {
    return { success: false, output: '', error: `文件不存在: ${userPath}`, durationMs: Date.now() - startTime };
  }

  if (statSync(safe.path).isDirectory()) {
    return { success: false, output: '', error: `${userPath} 是目录，不是文件`, durationMs: Date.now() - startTime };
  }

  try {
    const content = readFileSync(safe.path, 'utf-8');
    return { success: true, output: content, durationMs: Date.now() - startTime };
  } catch (err: any) {
    return { success: false, output: '', error: `读取失败: ${err.message}`, durationMs: Date.now() - startTime };
  }
}

export function toolFileWrite(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const userPath = params.path as string;
  const content = params.content as string;

  if (!userPath) return { success: false, output: '', error: '缺少必填参数: path' };
  if (content === undefined) return { success: false, output: '', error: '缺少必填参数: content' };

  const safe = resolveSafePath(workspacePath, userPath);
  if (safe.error) return { success: false, output: '', error: safe.error, durationMs: Date.now() - startTime };
  if (!safe.path) return { success: false, output: '', error: '路径解析失败' };

  try {
    // 确保父目录存在
    const dir = require('path').dirname(safe.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(safe.path, content, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');
    return { success: true, output: `文件已写入: ${userPath} (${size} bytes)`, durationMs: Date.now() - startTime };
  } catch (err: any) {
    return { success: false, output: '', error: `写入失败: ${err.message}`, durationMs: Date.now() - startTime };
  }
}

export function toolFileDelete(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const userPath = params.path as string;
  if (!userPath) return { success: false, output: '', error: '缺少必填参数: path' };

  const safe = resolveSafePath(workspacePath, userPath);
  if (safe.error) return { success: false, output: '', error: safe.error, durationMs: Date.now() - startTime };
  if (!safe.path) return { success: false, output: '', error: '路径解析失败' };

  if (!existsSync(safe.path)) {
    return { success: false, output: '', error: `文件不存在: ${userPath}`, durationMs: Date.now() - startTime };
  }

  try {
    unlinkSync(safe.path);
    return { success: true, output: `文件已删除: ${userPath}`, durationMs: Date.now() - startTime };
  } catch (err: any) {
    return { success: false, output: '', error: `删除失败: ${err.message}`, durationMs: Date.now() - startTime };
  }
}

export function toolListFiles(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const subPath = params.path as string | undefined;

  let targetPath = workspacePath;
  if (subPath) {
    const safe = resolveSafePath(workspacePath, subPath);
    if (safe.error) return { success: false, output: '', error: safe.error, durationMs: Date.now() - startTime };
    if (!safe.path) return { success: false, output: '', error: '路径解析失败', durationMs: Date.now() - startTime };
    targetPath = safe.path;
  }

  if (!existsSync(targetPath)) {
    return { success: false, output: '', error: `目录不存在: ${subPath || '.'}`, durationMs: Date.now() - startTime };
  }

  if (!statSync(targetPath).isDirectory()) {
    return { success: false, output: '', error: `${subPath || '.'} 不是目录，请改用 file_read 读取`, durationMs: Date.now() - startTime };
  }

  const entries = readdirSync(targetPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    return { success: true, output: `目录为空: ${subPath || '.'}`, durationMs: Date.now() - startTime };
  }

  const lines = entries.map((entry) => {
    const full = join(targetPath, entry.name);
    try {
      if (entry.isDirectory()) {
        return `[目录] ${entry.name}/`;
      }
      return `[文件] ${entry.name} (${statSync(full).size}B)`;
    } catch {
      return entry.isDirectory() ? `[目录] ${entry.name}/` : `[文件] ${entry.name}`;
    }
  });

  return {
    success: true,
    output: `目录内容 (${subPath || '.'}):\n${lines.join('\n')}`,
    durationMs: Date.now() - startTime,
  };
}

export function toolFileExists(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const userPath = params.path as string;
  if (!userPath) return { success: false, output: '', error: '缺少必填参数: path', durationMs: Date.now() - startTime };

  const safe = resolveSafePath(workspacePath, userPath);
  if (safe.error) return { success: false, output: '', error: safe.error, durationMs: Date.now() - startTime };
  if (!safe.path) return { success: false, output: '', error: '路径解析失败', durationMs: Date.now() - startTime };

  if (!existsSync(safe.path)) {
    return { success: true, output: `路径不存在: ${userPath}`, durationMs: Date.now() - startTime };
  }

  const type = statSync(safe.path).isDirectory() ? '目录' : '文件';
  return { success: true, output: `路径存在: ${userPath}（${type}）`, durationMs: Date.now() - startTime };
}

// ========== Shell工具 ==========

export function toolShellExecute(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const command = params.command as string;
  const timeout = (params.timeout_ms as number) || 30000;

  if (!command) return { success: false, output: '', error: '缺少必填参数: command' };

  // 危险命令黑名单（防止破坏系统）
  const dangerousCmds = /^\s*(rm\s+-rf\s+\/|format\s+|dd\s+if=|del\s+\/f\s+\/s\s+\\)/i;
  if (dangerousCmds.test(command)) {
    return { success: false, output: '', error: '检测到危险命令，已拒绝执行', durationMs: Date.now() - startTime };
  }

  try {
    const output = execSync(command, {
      cwd: workspacePath,
      timeout,
      encoding: 'utf-8',
      windowsHide: true
    });
    return { success: true, output: output || '(命令执行成功，无输出)', durationMs: Date.now() - startTime };
  } catch (err: any) {
    let errOutput = err.message;
    if (err.stdout) errOutput += `\nSTDOUT:\n${err.stdout}`;
    if (err.stderr) errOutput += `\nSTDERR:\n${err.stderr}`;
    return { success: false, output: '', error: errOutput, durationMs: Date.now() - startTime };
  }
}

// ========== HTTP工具 ==========

export async function toolHttpRequest(params: Record<string, any>, _workspacePath: string): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const url = params.url as string;
  const method = (params.method as string) || 'GET';
  const body = params.body as string | undefined;

  if (!url) return { success: false, output: '', error: '缺少必填参数: url' };

  try {
    const response = await axios({
      url,
      method,
      data: body,
      timeout: 30000,
      responseType: 'text',
      // 限制响应大小为5MB，防止阻塞
      maxContentLength: 5 * 1024 * 1024,
      maxRedirects: 5,
      validateStatus: () => true // 不抛HTTP错误，让Agent自己判断
    });

    const output = [
      `HTTP ${response.status} ${response.statusText}`,
      `Content-Type: ${response.headers['content-type'] || 'unknown'}`,
      '',
      String(response.data).substring(0, 10000) // 截取前10000字符
    ].join('\n');

    return { success: true, output, durationMs: Date.now() - startTime };
  } catch (err: any) {
    return { success: false, output: '', error: `请求失败: ${err.message}`, durationMs: Date.now() - startTime };
  }
}

// ========== 代码搜索工具 ==========

export function toolCodeSearch(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const query = params.query as string;
  const subPath = params.path as string | undefined;

  if (!query) return { success: false, output: '', error: '缺少必填参数: query' };

  const searchRoot = subPath ? resolveSafePath(workspacePath, subPath) : { path: workspacePath };
  if (searchRoot.error) return { success: false, output: '', error: searchRoot.error, durationMs: Date.now() - startTime };
  if (!searchRoot.path) return { success: false, output: '', error: '路径解析失败' };

  if (!existsSync(searchRoot.path)) {
    return { success: false, output: '', error: '搜索路径不存在', durationMs: Date.now() - startTime };
  }

  const results: string[] = [];
  const queryLower = query.toLowerCase();
  let matchCount = 0;
  const MAX_MATCHES = 50;

  function walk(dir: string) {
    if (matchCount >= MAX_MATCHES) return;
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (matchCount >= MAX_MATCHES) return;
      // 跳过常见排除目录
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') continue;
      // 跳过二进制文件扩展名
      const ext = entry.name.split('.').pop()?.toLowerCase() || '';
      const skipExts = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'pdf', 'zip', 'rar', 'exe', 'dll', 'so'];
      if (!entry.isDirectory() && skipExts.includes(ext)) continue;

      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        try {
          const content = readFileSync(full, 'utf-8');
          const lines = content.split('\n');
          const relative = require('path').relative(workspacePath, full);
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(queryLower)) {
              results.push(`${relative}:${i + 1}: ${lines[i].substring(0, 200)}`);
              matchCount++;
              if (matchCount >= MAX_MATCHES) return;
            }
          }
        } catch {
          // 跳过无法读取的文件
        }
      }
    }
  }

  walk(searchRoot.path);

  if (results.length === 0) {
    return { success: true, output: `未找到匹配 "${query}" 的结果`, durationMs: Date.now() - startTime };
  }

  const output = [
    `找到 ${matchCount} 处匹配（最多显示 ${MAX_MATCHES} 条）:`,
    '',
    ...results
  ].join('\n');

  return { success: true, output, durationMs: Date.now() - startTime };
}

// ========== Git工具 ==========

export function toolGitOperation(params: Record<string, any>, workspacePath: string): ToolExecutionResult {
  const startTime = Date.now();
  const command = params.command as string;
  const args = (params.args as string[] | undefined) || [];

  if (!command) return { success: false, output: '', error: '缺少必填参数: command' };

  // 安全Git命令白名单
  const safeCommands = [
    'status', 'log', 'add', 'diff', 'branch', 'tag', 'show', 'fetch', 'remote', 'config', 'rev-parse',
    // 只读查询类：用于定位文件、查看历史，无需审批
    'ls-files', 'ls-tree', 'describe', 'blame', 'grep', 'rev-list', 'cat-file',
  ];
  const commandLower = command.toLowerCase();
  if (!safeCommands.includes(commandLower) && !commandLower.startsWith('checkout')) {
    // commit, push, pull 需要审批，此处已通过审批流程到达实现层，放行但警告
    if (['commit', 'push', 'pull', 'reset'].includes(commandLower)) {
      // 允许执行
    } else {
      return { success: false, output: '', error: `Git命令 "${command}" 不在白名单中`, durationMs: Date.now() - startTime };
    }
  }

  try {
    // 检查是否是Git仓库
    if (!existsSync(join(workspacePath, '.git'))) {
      return { success: false, output: '', error: '项目目录不是Git仓库', durationMs: Date.now() - startTime };
    }

    const cmdArgs = [command, ...args].filter(Boolean);
    const output = execSync(`git ${cmdArgs.join(' ')}`, {
      cwd: workspacePath,
      timeout: 60000,
      encoding: 'utf-8',
      windowsHide: true
    });
    return { success: true, output: output || '(无输出)', durationMs: Date.now() - startTime };
  } catch (err: any) {
    const errOutput = err.stderr ? err.stderr.toString() : err.message;
    return { success: false, output: '', error: errOutput, durationMs: Date.now() - startTime };
  }
}

// ========== 工具分发器 ==========

export function resolveToolProjectId(params: Record<string, any>, context: ToolExecutionContext): string | undefined {
  const explicitProjectId = typeof params.projectId === 'string' ? params.projectId.trim() : '';
  if (explicitProjectId) return explicitProjectId;

  const contextProjectId = context.projectId?.trim();
  if (contextProjectId) return contextProjectId;

  const ticketId = context.ticketId?.trim();
  if (!ticketId) return undefined;

  const ticket = getTicketById(ticketId);
  return ticket?.projectId?.trim();
}

export function toolGetProjectMembers(params: Record<string, any>, context: ToolExecutionContext): ToolExecutionResult {
  const startTime = Date.now();
  const projectId = resolveToolProjectId(params, context);
  if (!projectId) {
    return { success: false, output: '', error: '缺少必填参数: projectId', durationMs: Date.now() - startTime };
  }

  const members = getProjectMemberProfiles(projectId);
  return {
    success: true,
    output: JSON.stringify(members, null, 2),
    durationMs: Date.now() - startTime,
  };
}

export async function toolCreateTicket(params: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const projectId = resolveToolProjectId(params, context);
  const title = params.title as string;
  if (!projectId) return { success: false, output: '', error: '缺少必填参数: projectId', durationMs: Date.now() - startTime };
  if (!title) return { success: false, output: '', error: '缺少必填参数: title', durationMs: Date.now() - startTime };

  const assignee = resolveProjectAssignee(projectId, params.assignee as string | undefined);
  const ticket = createTicket({
    projectId,
    title,
    description: (params.description as string) || '',
    type: (params.type as any) || 'task',
    priority: (params.priority as any) || 'medium',
    assigneeId: assignee?.agentId,
    createdBy: context.agentId || 'agent',
    parentTicketId: (params.parentTicketId as string) || context.ticketId,
  });

  // 同步串行：等待子工单执行完成再返回，保证依赖顺序（工具路径无 onEvent 透传，
  // 子工单进展可通过子工单详情页轮询查看）
  await dispatchChildTicketExecution({
    parentTicketId: (params.parentTicketId as string) || context.ticketId,
    createdTicket: ticket,
    projectId,
    triggerAgentId: context.agentId,
    triggerAgentName: context.agentName,
  });

  return {
    success: true,
    output: JSON.stringify({
      ticket,
      resolvedAssignee: assignee,
    }, null, 2),
    durationMs: Date.now() - startTime,
  };
}

export async function executeToolImplementation(
  toolName: string,
  params: Record<string, any>,
  workspacePath: string,
  context: ToolExecutionContext = { workspacePath }
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'file_read': return toolFileRead(params, workspacePath);
    case 'file_write': return toolFileWrite(params, workspacePath);
    case 'file_delete': return toolFileDelete(params, workspacePath);
    case 'list_files': return toolListFiles(params, workspacePath);
    case 'file_exists': return toolFileExists(params, workspacePath);
    case 'shell_execute': return toolShellExecute(params, workspacePath);
    case 'http_request': return await toolHttpRequest(params, workspacePath);
    case 'code_search': return toolCodeSearch(params, workspacePath);
    case 'git_operation': return toolGitOperation(params, workspacePath);
    case 'get_project_members': return toolGetProjectMembers(params, context);
    case 'create_ticket': return toolCreateTicket(params, context);
    default:
      return { success: false, output: '', error: `未知工具: ${toolName}` };
  }
}
