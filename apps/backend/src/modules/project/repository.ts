// apps/backend/src/modules/project/repository.ts
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join, resolve, sep } from 'path';
import { config } from '../../config/index.js';
import { getAgentFromDb, getBuiltinAgentIds } from '../agent/loader.js';
import { getAgentFromDb, getAllAgentsFromDb } from '../agent/loader.js';
import type { Agent } from '../agent/types.js';
import type { Project, ProjectMember, CreateProjectInput, UpdateProjectInput } from './types.js';

export interface ProjectMemberProfile extends ProjectMember {
  agentName: string;
  agentRole: string;
  isSupervisor: boolean;
}

const projectsDir = join(config.dataDir, 'projects');
const PROJECT_META_FILE = 'project.json';

function normalizePath(pathValue: string): string {
  return resolve(pathValue).replace(/[/\\]+$/g, '').toLowerCase();
}

function isPathInside(parentDir: string, candidatePath: string): boolean {
  const parent = normalizePath(parentDir);
  const candidate = normalizePath(candidatePath);
  return candidate === parent || candidate.startsWith(parent + sep.toLowerCase());
}

function ensureGitInit(workspacePath: string): void {
  // 使工作空间成为 git 仓库，保证 git_operation 工具可用（失败不阻塞项目创建）
  if (existsSync(join(workspacePath, '.git'))) return;
  try {
    execSync('git init', {
      cwd: workspacePath,
      timeout: 10000,
      encoding: 'utf-8',
      windowsHide: true,
      stdio: 'pipe',
    });
  } catch (err: any) {
    console.warn('[project] git init 失败（不影响项目创建）:', err.message);
  }
}

function ensureProjectDirScaffold(projectDir: string): void {
  const workspacePath = join(projectDir, 'workspace');
  mkdirSync(workspacePath, { recursive: true });
  mkdirSync(join(projectDir, 'agents'), { recursive: true });
  mkdirSync(join(projectDir, 'tickets'), { recursive: true });
  ensureGitInit(workspacePath);
}

function sanitizeName(name: string): string {
  const trimmed = name.trim();
  const safe = trimmed
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return safe || 'untitled_project';
}

function buildUniqueProjectDirByName(projectName: string, currentDirPath?: string): string {
  const base = sanitizeName(projectName);
  let candidate = base;
  let n = 2;

  while (true) {
    const full = join(projectsDir, candidate);
    if (!existsSync(full) || (currentDirPath && full === currentDirPath)) {
      return full;
    }
    candidate = `${base}_${n}`;
    n += 1;
  }
}

function resolveProjectDirFromRecord(project: Project): string {
  const wsDir = dirname(project.workspacePath);
  if (existsSync(wsDir) && isPathInside(projectsDir, wsDir)) {
    return wsDir;
  }

  const legacyUuidDir = join(projectsDir, project.id);
  if (existsSync(legacyUuidDir)) {
    return legacyUuidDir;
  }

  return buildUniqueProjectDirByName(project.name);
}

function getProjectDir(projectId: string): string {
  const project = getProjectById(projectId);
  if (project) {
    return resolveProjectDirFromRecord(project);
  }
  return join(projectsDir, projectId);
}

function getProjectMetaPath(projectId: string): string {
  return join(getProjectDir(projectId), PROJECT_META_FILE);
}

function writeJsonFile(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function persistProjectDocument(project: Project): void {
  const members = getProjectMembers(project.id);
  mkdirSync(getProjectDir(project.id), { recursive: true });
  writeJsonFile(getProjectMetaPath(project.id), {
    project,
    members,
    updatedAt: new Date().toISOString(),
  });
}

export function getProjectStorageDir(projectId: string): string {
  return getProjectDir(projectId);
}

export function getProjectTicketsDir(projectId: string): string {
  return join(getProjectDir(projectId), 'tickets');
}

export function buildProjectWorkspaceDigest(projectId: string, maxEntries = 120): string {
  const project = getProjectById(projectId);
  if (!project) {
    return '项目不存在，无法读取项目目录上下文。';
  }

  const root = getProjectDir(projectId);
  if (!existsSync(root)) {
    return '项目目录不存在，无法读取目录内容。';
  }

  const lines: string[] = [];
  let count = 0;
  const maxDepth = 4;

  const walk = (dirPath: string, depth: number): void => {
    if (count >= maxEntries || depth > maxDepth) return;

    const entries = readdirSync(dirPath, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (count >= maxEntries) break;

      const fullPath = join(dirPath, entry.name);
      const relPath = fullPath.slice(root.length + 1).replace(/\\/g, '/');
      const indent = '  '.repeat(depth);

      if (entry.isDirectory()) {
        lines.push(`${indent}- ${relPath}/`);
        count += 1;
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        let sizeLabel = '';
        try {
          const st = statSync(fullPath);
          sizeLabel = ` (${st.size}B)`;
        } catch {
          sizeLabel = '';
        }
        lines.push(`${indent}- ${relPath}${sizeLabel}`);
        count += 1;
      }
    }
  };

  walk(root, 0);

  if (lines.length === 0) {
    return '项目目录为空。';
  }

  const truncated = count >= maxEntries ? '\n(目录条目过多，已截断)' : '';
  return `项目目录摘要（${project.name}）:\n${lines.join('\n')}${truncated}`;
}

export function migrateProjectStorageDirsToNameBased(): void {
  const db = getDb();
  const projects = getAllProjects();

  for (const project of projects) {
    const currentProjectDir = resolveProjectDirFromRecord(project);
    const targetProjectDir = buildUniqueProjectDirByName(project.name, currentProjectDir);

    let nextWorkspacePath = join(currentProjectDir, 'workspace');

    if (!isPathInside(projectsDir, currentProjectDir)) {
      console.warn(`[project-migrate] skip unsafe project dir: ${currentProjectDir}`);
      continue;
    }

    ensureProjectDirScaffold(currentProjectDir);

    if (currentProjectDir !== targetProjectDir && existsSync(currentProjectDir)) {
      renameSync(currentProjectDir, targetProjectDir);
      nextWorkspacePath = join(targetProjectDir, 'workspace');
    }

    db.prepare('UPDATE projects SET workspace_path = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(nextWorkspacePath, project.id);

    const refreshed = getProjectById(project.id);
    if (refreshed) {
      const safeDir = resolveProjectDirFromRecord(refreshed);
      ensureProjectDirScaffold(safeDir);
      persistProjectDocument(refreshed);
    }
  }
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDb();
  const id = uuidv4();
  const projectDir = buildUniqueProjectDirByName(input.name);
  const workspacePath = join(projectDir, 'workspace');

  // 创建项目目录结构
  ensureProjectDirScaffold(projectDir);

  // 默认主 Agent 为监理 agent（supervisor）
  const supervisorId = input.supervisorId || 'supervisor';

  db.prepare(`
    INSERT INTO projects (id, name, description, supervisor_id, workspace_path, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, input.name, input.description || '', supervisorId, workspacePath);

  // 所有内置 Agent 自动加入项目成员
  for (const agentId of getBuiltinAgentIds()) {
    addProjectMember(id, agentId);
  }

  const project = getProjectById(id)!;
  persistProjectDocument(project);
  return project;
}

export function getProjectById(id: string): Project | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRowToProject(row);
}

export function getAllProjects(): Project[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as any[];
  return rows.map(mapRowToProject);
}

export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  const db = getDb();
  const current = getProjectById(id);
  if (!current) return null;

  const name = input.name ?? current.name;
  const description = input.description ?? current.description;
  const supervisorId = input.supervisorId !== undefined ? input.supervisorId : current.supervisorId;
  const status = input.status ?? current.status;
  let workspacePath = current.workspacePath;

  if (input.name && input.name !== current.name) {
    const currentProjectDir = resolveProjectDirFromRecord(current);
    const targetProjectDir = buildUniqueProjectDirByName(input.name, currentProjectDir);
    if (currentProjectDir !== targetProjectDir && isPathInside(projectsDir, currentProjectDir)) {
      ensureProjectDirScaffold(currentProjectDir);
      renameSync(currentProjectDir, targetProjectDir);
      workspacePath = join(targetProjectDir, 'workspace');
    } else if (currentProjectDir !== targetProjectDir) {
      workspacePath = join(targetProjectDir, 'workspace');
      ensureProjectDirScaffold(targetProjectDir);
    }
  }

  db.prepare(`
    UPDATE projects SET name = ?, description = ?, supervisor_id = ?, workspace_path = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, supervisorId, workspacePath, status, id);

  // 如果更换了主Agent，确保新主Agent是项目成员
  if (input.supervisorId && input.supervisorId !== current.supervisorId) {
    addProjectMember(id, input.supervisorId);
  }

  const project = getProjectById(id);
  if (project) {
    persistProjectDocument(project);
  }
  return project;
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  const project = getProjectById(id);
  if (!project) return false;

  const projectDir = resolveProjectDirFromRecord(project);
  const ticketRows = db.prepare('SELECT id FROM tickets WHERE project_id = ?').all(id) as Array<{ id: string }>;
  const ticketIds = ticketRows.map((row) => row.id);

  const tx = db.transaction(() => {
    for (const ticketId of ticketIds) {
      db.prepare('DELETE FROM messages WHERE ticket_id = ?').run(ticketId);
      db.prepare('DELETE FROM approval_requests WHERE ticket_id = ?').run(ticketId);
    }

    db.prepare('DELETE FROM tickets WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM project_members WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM agent_memories WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });

  tx();

  if (existsSync(projectDir) && isPathInside(projectsDir, projectDir)) {
    rmSync(projectDir, { recursive: true, force: true });
  }

  return true;
}

// 项目成员管理
export function addProjectMember(projectId: string, agentId: string): ProjectMember {
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT OR IGNORE INTO project_members (id, project_id, agent_id)
    VALUES (?, ?, ?)
  `).run(id, projectId, agentId);

  const member = getProjectMember(projectId, agentId)!;
  const project = getProjectById(projectId);
  if (project) {
    persistProjectDocument(project);
  }
  return member;
}

export function getProjectMember(projectId: string, agentId: string): ProjectMember | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND agent_id = ?').get(projectId, agentId) as any;
  if (!row) return null;
  return mapRowToMember(row);
}

export function getProjectMembers(projectId: string): ProjectMember[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM project_members WHERE project_id = ? ORDER BY joined_at ASC').all(projectId) as any[];
  return rows.map(mapRowToMember);
}

export function getProjectMemberProfiles(projectId: string): ProjectMemberProfile[] {
  const members = getProjectMembers(projectId);

  return members.map((member) => {
    const agent = getAgentFromDb(member.agentId);
    return {
      ...member,
      agentName: agent?.name || member.agentId,
      agentRole: agent?.role || 'specialist',
      isSupervisor: agent?.role === 'supervisor',
    };
  });
}

/**
 * 基于项目上下文推荐应添加到项目的 Agent 列表（排除已在项目中的 Agent）。
 * 当前实现为启发式规则：优先包含项目 supervisor（若存在且未加入），
 * 然后按角色优先（supervisor 优先）和名称排序返回若干候选。
 */
export function suggestProjectMembers(projectId: string, maxSuggestions = 6): Agent[] {
  const project = getProjectById(projectId);
  const members = getProjectMembers(projectId);
  const memberIds = new Set(members.map(m => m.agentId));

  const allAgents = getAllAgentsFromDb();

  const suggestions: Agent[] = [];

  if (project?.supervisorId) {
    const sup = allAgents.find(a => a.id === project.supervisorId);
    if (sup && !memberIds.has(sup.id)) {
      suggestions.push(sup);
    }
  }

  const rest = allAgents
    .filter(a => !memberIds.has(a.id) && a.id !== project?.supervisorId)
    .sort((a, b) => {
      const ra = a.role === 'supervisor' ? 0 : 1;
      const rb = b.role === 'supervisor' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });

  for (const a of rest) {
    if (suggestions.length >= maxSuggestions) break;
    suggestions.push(a);
  }

  return suggestions.slice(0, maxSuggestions);
}

export function resolveProjectAssignee(projectId: string, assigneeHint?: string): ProjectMemberProfile | null {
  const members = getProjectMemberProfiles(projectId);
  if (members.length === 0) return null;

  const hint = assigneeHint?.trim();
  if (!hint) {
    return members.find((member) => !member.isSupervisor) || members[0];
  }

  const normalizedHint = hint.toLowerCase();
  const exact = members.find((member) =>
    member.agentId.toLowerCase() === normalizedHint ||
    member.agentName.toLowerCase() === normalizedHint,
  );
  if (exact) return exact;

  const fuzzy = members.find((member) =>
    member.agentId.toLowerCase().includes(normalizedHint) ||
    member.agentName.toLowerCase().includes(normalizedHint) ||
    normalizedHint.includes(member.agentName.toLowerCase()),
  );
  if (fuzzy) return fuzzy;

  if (normalizedHint.includes('监理') || normalizedHint.includes('supervisor')) {
    return members.find((member) => member.isSupervisor) || members[0];
  }

  return members.find((member) => !member.isSupervisor) || members[0];
}

export function getAgentProjects(agentId: string): Project[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.* FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.agent_id = ? AND p.status = 'active'
    ORDER BY p.created_at DESC
  `).all(agentId) as any[];
  return rows.map(mapRowToProject);
}

function mapRowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    supervisorId: row.supervisor_id,
    workspacePath: row.workspace_path,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRowToMember(row: any): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    agentId: row.agent_id,
    joinedAt: row.joined_at
  };
}
