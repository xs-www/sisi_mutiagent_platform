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

export async function updateProject(id: string, body: Partial<Project>): Promise<Project> {
  const resp = await http.patch(`/projects/${id}`, body);
  return resp.data;
}

export async function deleteProject(id: string): Promise<void> {
  await http.delete(`/projects/${id}`);
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
