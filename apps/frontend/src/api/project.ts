import { http } from './http';
import type { Project, ProjectMember } from '../types';

export async function getProjects(): Promise<Project[]> {
  const resp = await http.get('/projects');
  return resp.data;
}

export async function getProject(id: string): Promise<Project> {
  const resp = await http.get(`/projects/${id}`);
  return resp.data;
}

export async function createProject(body: {
  name: string;
  description?: string;
  supervisorId?: string;
}): Promise<Project> {
  const resp = await http.post('/projects', body);
  return resp.data;
}

export interface ProjectAiSuggestion {
  description: string;
  recommendedAgentIds: string[];
}

// AI 根据项目名称生成项目描述，并推荐应加入项目的 Agent
export async function generateProjectAi(body: {
  name: string;
  agents: Array<{ id: string; name: string; role?: string; description?: string }>;
}): Promise<ProjectAiSuggestion> {
  const resp = await http.post('/projects/generate-ai', body);
  return resp.data;
}

export async function updateProject(id: string, body: Partial<Project>): Promise<Project> {
  const resp = await http.patch(`/projects/${id}`, body);
  return resp.data;
}

export async function deleteProject(id: string): Promise<void> {
  await http.delete(`/projects/${id}`);
}

// 在系统资源管理器中打开项目目录（target='project'）或工作空间（target='workspace'）
export async function openProjectFolder(projectId: string, target: 'project' | 'workspace'): Promise<void> {
  await http.post(`/projects/${projectId}/open-folder`, { target });
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const resp = await http.get(`/projects/${projectId}/members`);
  return resp.data;
}

export async function addProjectMember(projectId: string, agentId: string): Promise<ProjectMember> {
  const resp = await http.post(`/projects/${projectId}/members`, { agentId });
  return resp.data;
}

export async function removeProjectMember(projectId: string, agentId: string): Promise<void> {
  await http.delete(`/projects/${projectId}/members/${agentId}`);
}
