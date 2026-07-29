// apps/backend/src/modules/project/types.ts
export interface Project {
  id: string;
  name: string;
  description: string;
  supervisorId: string | null;
  workspacePath: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  agentId: string;
  joinedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  supervisorId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  supervisorId?: string | null;
  status?: 'active' | 'archived';
}
