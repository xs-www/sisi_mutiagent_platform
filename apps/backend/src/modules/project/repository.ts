// apps/backend/src/modules/project/repository.ts
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '../../config/index.js';
import { getAgentFromDb } from '../agent/loader.js';
import type { Project, ProjectMember, CreateProjectInput, UpdateProjectInput } from './types.js';

export interface ProjectMemberProfile extends ProjectMember {
  agentName: string;
  agentRole: string;
  isSupervisor: boolean;
}

const projectsDir = join(config.dataDir, 'projects');

export function createProject(input: CreateProjectInput): Project {
  const db = getDb();
  const id = uuidv4();
  const workspacePath = join(projectsDir, id, 'workspace');

  // 创建项目目录结构
  mkdirSync(join(projectsDir, id, 'workspace'), { recursive: true });
  mkdirSync(join(projectsDir, id, 'agents'), { recursive: true });
  mkdirSync(join(projectsDir, id, 'tickets'), { recursive: true });

  db.prepare(`
    INSERT INTO projects (id, name, description, supervisor_id, workspace_path, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, input.name, input.description || '', input.supervisorId || null, workspacePath);

  // 如果指定了主Agent，自动加入项目
  if (input.supervisorId) {
    addProjectMember(id, input.supervisorId);
  }

  return getProjectById(id)!;
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

  db.prepare(`
    UPDATE projects SET name = ?, description = ?, supervisor_id = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, supervisorId, status, id);

  // 如果更换了主Agent，确保新主Agent是项目成员
  if (input.supervisorId && input.supervisorId !== current.supervisorId) {
    addProjectMember(id, input.supervisorId);
  }

  return getProjectById(id);
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  // 删除关联的项目成员
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(id);
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}

// 项目成员管理
export function addProjectMember(projectId: string, agentId: string): ProjectMember {
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT OR IGNORE INTO project_members (id, project_id, agent_id)
    VALUES (?, ?, ?)
  `).run(id, projectId, agentId);

  return getProjectMember(projectId, agentId)!;
}

export function removeProjectMember(projectId: string, agentId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM project_members WHERE project_id = ? AND agent_id = ?').run(projectId, agentId);
  return result.changes > 0;
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
