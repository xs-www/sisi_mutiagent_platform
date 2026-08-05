// apps/backend/src/modules/project/routes.ts
import { Router } from 'express';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import {
  createProject, getProjectById, getAllProjects, updateProject, deleteProject,
  addProjectMember, removeProjectMember, getProjectMembers, getAgentProjects,
  getProjectStorageDir,
} from './repository.js';
import { getProjectMemberProfiles } from './repository.js';
import { chatWithPlatformModels } from '../llm/router.js';
import type { ChatMessage } from '../llm/types.js';
import type { CreateProjectInput, UpdateProjectInput } from './types.js';

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

// 解析模型返回的 JSON（容错 markdown 代码块与前后多余文字）
function parseAiJson(content: string): any {
  let text = content.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text);
}

// AI 生成项目描述，并推荐应加入项目的 Agent
projectRouter.post('/generate-ai', async (req, res) => {
  try {
    const { name, agents } = req.body as {
      name?: string;
      agents?: Array<{ id?: string; name?: string; role?: string; description?: string }>;
    };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const agentList = (Array.isArray(agents) ? agents : [])
      .filter((a) => a && typeof a.id === 'string' && a.id && typeof a.name === 'string' && a.name)
      .map((a) => `- ${a.id}（${a.name}${a.description ? `：${a.description}` : ''}）`)
      .join('\n') || '（当前无可选 Agent）';

    const systemPrompt = `你是多智能体协作平台的项目规划助手。根据用户提供的项目名称和可选 Agent 列表：
1. 生成一段专业的中文项目描述（80-200 字，说明项目目标、范围与预期产出）；
2. 从 Agent 列表中挑选你认为该项目需要加入的 Agent。

严格输出一个 JSON 对象，不要包含任何解释文字或 markdown 标记：
{"description": "项目描述", "recommendedAgentIds": ["agent id", ...]}

要求：
- description 必须为非空字符串；
- recommendedAgentIds 只能从给定 Agent 列表的 id 中选取，可根据项目类型选择合适的数量，若无从选择则返回空数组 []。`;

    const userPrompt = `项目名称：${name.trim()}
可选 Agent 列表：
${agentList}

请根据项目名称与可用 Agent 输出 JSON。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await chatWithPlatformModels(messages, { temperature: 0.7 });
    const parsed = parseAiJson(response.message.content);
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    const validIds = new Set((Array.isArray(agents) ? agents : [])
      .map((a) => a?.id)
      .filter((id): id is string => typeof id === 'string' && !!id));
    const recommendedAgentIds = Array.isArray(parsed.recommendedAgentIds)
      ? parsed.recommendedAgentIds.filter((id: unknown) => typeof id === 'string' && validIds.has(id))
      : [];

    res.json({ description, recommendedAgentIds });
  } catch (error: any) {
    console.error('Error generating project AI suggestion:', error);
    res.status(500).json({ error: error.message || 'Failed to generate project AI suggestion' });
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

// 在系统资源管理器中打开项目目录或工作空间
projectRouter.post('/:id/open-folder', async (req, res) => {
  try {
    const project = getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const target = req.body?.target === 'workspace' ? 'workspace' : 'project';
    // project: 项目根目录（projects/项目名/）；workspace: 项目工作空间（projects/项目名/workspace）
    const targetPath = target === 'workspace' ? project.workspacePath : getProjectStorageDir(project.id);

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
projectRouter.get('/:id/members', (req, res) => {
  try {
    const members = getProjectMembers(req.params.id);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取项目成员画像（含Agent名称/角色，供主Agent做任务分配）
projectRouter.get('/:id/agent-group', (req, res) => {
  try {
    const members = getProjectMemberProfiles(req.params.id);
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
