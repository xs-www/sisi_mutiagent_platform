// apps/backend/src/modules/project/routes.ts
import { Router } from 'express';
import {
  createProject, getProjectById, getAllProjects, updateProject, deleteProject,
  addProjectMember, removeProjectMember, getProjectMembers, getAgentProjects
} from './repository.js';
import type { CreateProjectInput, UpdateProjectInput } from './types.js';

export const projectRouter = Router();

// 创建项目
projectRouter.post('/', (req, res) => {
  try {
    const input: CreateProjectInput = {
      name: req.body.name,
      description: req.body.description,
      supervisorId: req.body.supervisorId
    };

    if (!input.name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const project = createProject(input);
    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取所有项目
projectRouter.get('/', (req, res) => {
  try {
    const projects = getAllProjects();
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取Agent参与的所有项目（特殊路由，必须放在 /:id 之前以避免冲突）
projectRouter.get('/agent/:agentId/projects', (req, res) => {
  try {
    const projects = getAgentProjects(req.params.agentId);
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个项目
projectRouter.get('/:id', (req, res) => {
  try {
    const project = getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新项目
projectRouter.patch('/:id', (req, res) => {
  try {
    const input: UpdateProjectInput = {
      name: req.body.name,
      description: req.body.description,
      supervisorId: req.body.supervisorId,
      status: req.body.status
    };

    const project = updateProject(req.params.id, input);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除项目
projectRouter.delete('/:id', (req, res) => {
  try {
    const success = deleteProject(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取项目成员列表
projectRouter.get('/:id/members', (req, res) => {
  try {
    const members = getProjectMembers(req.params.id);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 添加Agent到项目
projectRouter.post('/:id/members', (req, res) => {
  try {
    const agentId = req.body.agentId;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const member = addProjectMember(req.params.id, agentId);
    res.status(201).json(member);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 从项目移除Agent
projectRouter.delete('/:id/members/:agentId', (req, res) => {
  try {
    const success = removeProjectMember(req.params.id, req.params.agentId);
    if (!success) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
