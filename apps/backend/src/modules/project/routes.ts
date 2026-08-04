// apps/backend/src/modules/project/routes.ts
import { Router } from 'express';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import type { CreateProjectInput, UpdateProjectInput } from './types.js';

// 动态加载 repository，避免静态类型/导出解析带来的问题
async function getRepo() {
  return await import('./repository.js');
}

export const projectRouter = Router();

// 调用系统资源管理器打开指定文件夹（跨平台）
function openInExplorer(targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      let cmd: string;
      let args: string[];
      if (process.platform === 'win32') {
        cmd = 'explorer.exe';
        args = [targetPath];
      } else if (process.platform === 'darwin') {
        cmd = 'open';
        args = [targetPath];
      } else {
        cmd = 'xdg-open';
        args = [targetPath];
      }
      // detached + unref：不阻塞请求；explorer.exe 即使成功也可能返回非零退出码，故不依赖退出码判定
      const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
      child.unref();
      child.on('error', (err) => reject(new Error(`无法打开文件夹: ${err.message}`)));
      // 给启动一点时间，若无同步错误即视为成功
      setTimeout(() => resolve(), 300);
    } catch (e: any) {
      reject(new Error(`无法打开文件夹: ${e.message}`));
    }
  });
}

// 创建项目
projectRouter.post('/', async (req, res) => {
  try {
    const input: CreateProjectInput = {
      name: req.body.name,
      description: req.body.description,
      supervisorId: req.body.supervisorId
    };

    if (!input.name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const repo = await getRepo() as any;
    const project = repo.createProject(input);
    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取所有项目
projectRouter.get('/', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const projects = repo.getAllProjects();
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取Agent参与的所有项目（特殊路由，必须放在 /:id 之前以避免冲突）
projectRouter.get('/agent/:agentId/projects', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const projects = repo.getAgentProjects(req.params.agentId);
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个项目
projectRouter.get('/:id', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const project = repo.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新项目
projectRouter.patch('/:id', async (req, res) => {
  try {
    const input: UpdateProjectInput = {
      name: req.body.name,
      description: req.body.description,
      supervisorId: req.body.supervisorId,
      status: req.body.status
    };

    const repo = await getRepo() as any;
    const project = repo.updateProject(req.params.id, input);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除项目
projectRouter.delete('/:id', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const success = repo.deleteProject(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 在系统资源管理器中打开项目目录或工作空间
projectRouter.post('/:id/open-folder', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const project = repo.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const target = req.body?.target === 'workspace' ? 'workspace' : 'project';
    // project: 项目根目录（projects/项目名/）；workspace: 项目工作空间（projects/项目名/workspace）
    const targetPath = target === 'workspace' ? project.workspacePath : (await getRepo() as any).getProjectStorageDir(project.id);

    // 确保目录存在
    mkdirSync(targetPath, { recursive: true });

    await openInExplorer(targetPath);
    res.json({ target, path: targetPath, opened: true });
  } catch (error: any) {
    console.error('Error opening folder:', error);
    res.status(500).json({ error: error.message || 'Failed to open folder' });
  }
});

// 获取项目成员列表
projectRouter.get('/:id/members', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const members = repo.getProjectMembers(req.params.id);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取项目成员画像（含Agent名称/角色，供主Agent做任务分配）
projectRouter.get('/:id/agent-group', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const members = repo.getProjectMemberProfiles(req.params.id);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 添加Agent到项目
projectRouter.post('/:id/members', async (req, res) => {
  try {
    const agentId = req.body.agentId;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }
    const repo = await getRepo() as any;

    const member = repo.addProjectMember(req.params.id, agentId);
    res.status(201).json(member);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 从项目移除Agent
projectRouter.delete('/:id/members/:agentId', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const success = repo.removeProjectMember(req.params.id, req.params.agentId);
    if (!success) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 添加智能推荐成员接口（由前端调用以获取推荐的 Agent 列表）
projectRouter.post('/:id/suggest-members', async (req, res) => {
  try {
    const repo = await getRepo() as any;
    const project = repo.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const suggest = repo.suggestProjectMembers as (projectId: string) => any[] | undefined;
    if (!suggest) return res.status(501).json({ error: 'suggestProjectMembers not implemented' });

    const suggestions = suggest(req.params.id);
    res.json(suggestions);
  } catch (error: any) {
    console.error('Error suggesting members:', error);
    res.status(500).json({ error: error.message });
  }
});
