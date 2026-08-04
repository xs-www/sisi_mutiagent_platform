import { http } from './http';
import type { Project, ProjectMember, Agent } from '../types';

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

// 基于项目与主 Agent，让后端（或 supervisor agent）推荐需要加入项目的 Agent 列表
export async function suggestProjectMembers(projectId: string): Promise<Agent[]> {
  const resp = await http.post(`/projects/${projectId}/suggest-members`);
  return resp.data;
}
