// apps/backend/src/modules/agent/routes.ts
import { Router } from 'express';
import { getAgentFromDb, getAllAgentsFromDb, loadAgentConfig, createAgentConfig, deleteAgentConfig, updateAgentConfig } from './loader.js';
import { chatWithPlatformModels } from '../llm/router.js';
import { getAllEffectiveToolDefinitions } from '../tools/registry.js';
import type { AgentConfig } from './types.js';
import type { ChatMessage } from '../llm/types.js';
import type { AgentEvent } from './events.js';

export const agentRouter = Router();

// 将任意字符串转为合法的 kebab-case Agent ID
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v == null) return fallback;
  return String(v);
}

// 解析并校验模型返回的 Agent 配置 JSON
function parseGeneratedConfig(content: string, validToolNames: string[]): {
  id: string;
  name: string;
  description: string;
  role: 'specialist' | 'supervisor';
  systemPrompt: string;
  personality: string;
  goal: string;
  constraints: string;
  methods: string;
  outputFormat: string;
  refusalStrategy: string;
  tools: string[];
  globalMemory: boolean;
  projectMemory: boolean;
} {
  let text = content.trim();

  // 去除可能的 markdown 代码块标记
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // 提取第一个 { ... } 块，避免前后多余文字干扰解析
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('模型返回的内容无法解析为 JSON，请重试或更换模型。');
  }

  const validRoles = ['specialist', 'supervisor'];
  const role: 'specialist' | 'supervisor' = validRoles.includes(parsed.role) ? parsed.role : 'specialist';

  // ID 规范化：缺失或非法时从 name 生成，仍非法则随机生成
  let id = asString(parsed.id).trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    id = slugify(asString(parsed.name));
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    id = `agent-${Math.random().toString(36).slice(2, 8)}`;
  }

  // 工具过滤：只保留合法工具名；若模型未给出则给出合理默认
  const toolsRaw = Array.isArray(parsed.tools) ? parsed.tools.filter((t: unknown) => typeof t === 'string') : [];
  const tools = toolsRaw.filter((t: string) => validToolNames.includes(t));
  if (tools.length === 0) {
    const defaults = ['file_read', 'file_write', 'code_search'];
    tools.push(...defaults.filter((t) => validToolNames.includes(t)));
  }

  const name = asString(parsed.name).trim() || id;

  return {
    id,
    name,
    description: asString(parsed.description).trim(),
    role,
    systemPrompt: asString(parsed.systemPrompt).trim() || `你是一个专业的${name}。`,
    personality: asString(parsed.personality).trim(),
    goal: asString(parsed.goal).trim(),
    constraints: asString(parsed.constraints).trim(),
    methods: asString(parsed.methods).trim(),
    outputFormat: asString(parsed.outputFormat).trim(),
    refusalStrategy: asString(parsed.refusalStrategy).trim(),
    tools,
    globalMemory: parsed.globalMemory !== false,
    projectMemory: parsed.projectMemory !== false,
  };
}

// AI 生成 Agent 配置（不落库，返回供前端审阅）
agentRouter.post('/generate', async (req, res) => {
  try {
    const { description, temperature } = req.body as { description?: string; temperature?: number };

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }

    const toolDefs = getAllEffectiveToolDefinitions();
    const toolList = toolDefs.map((t) => `- ${t.name}: ${t.description}`).join('\n');

    const systemPrompt = `你是多智能体协作平台的 Agent 配置设计师。根据用户的需求描述，生成一个完整、专业的 Agent 配置。

可用工具列表（tools 字段只能从下列名称中选择）：
${toolList}

角色（role）取值说明：
- specialist：专家型 Agent，负责某一具体领域的任务执行
- supervisor：监理型 Agent，负责任务分配、进度监督与结果汇总

请输出一个 JSON 对象，字段如下：
{
  "id": "Agent 唯一标识，小写英文 kebab-case，如 frontend-developer",
  "name": "Agent 显示名称（建议中文）",
  "description": "一句话简述 Agent 的职责",
  "role": "specialist 或 supervisor",
  "systemPrompt": "系统提示词，定义 Agent 的身份、专业能力与行为准则，需详细具体",
  "personality": "性格特征关键词，如 严谨、注重细节",
  "goal": "Agent 的核心目标",
  "constraints": "工作约束与限制条件",
  "methods": "推荐的工作方法与流程",
  "outputFormat": "期望的输出格式说明",
  "refusalStrategy": "遇到不合理请求时的拒绝策略",
  "tools": ["按需从可用工具列表中选择"],
  "globalMemory": true,
  "projectMemory": true
}

严格要求：
1. 仅输出一个 JSON 对象，不要包含任何解释文字、markdown 代码块标记或前后缀。
2. 所有字段必须存在，字符串字段若不适用可为空字符串。
3. id 必须为小写英文 kebab-case，只含字母、数字、下划线、连字符。
4. tools 必须从给定列表中选择，禁止编造工具名。
5. systemPrompt 要详尽专业，充分体现 Agent 的专业能力与行为规范。`;

    const userPrompt = `用户需求：${description.trim()}\n\n请据此生成对应的 Agent 配置，仅输出 JSON。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await chatWithPlatformModels(messages, {
      temperature: typeof temperature === 'number' && !Number.isNaN(temperature) ? temperature : 0.7,
    });

    const generated = parseGeneratedConfig(response.message.content, toolDefs.map((t) => t.name));
    res.json(generated);
  } catch (error: any) {
    console.error('Error generating agent:', error);
    res.status(500).json({ error: error.message || 'Failed to generate agent' });
  }
});

// 创建Agent
agentRouter.post('/', (req, res) => {
  try {
    const body = req.body as Partial<AgentConfig>;

    if (!body.id || !body.name || !body.role || !body.prompt || !body.tools || !body.memory) {
      return res.status(400).json({ error: 'id, name, role, prompt, tools, memory are required' });
    }

    const agent = createAgentConfig(body as AgentConfig);
    res.status(201).json(agent);
  } catch (error: any) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// 编辑Agent
agentRouter.put('/:id', (req, res) => {
  try {
    const updates = req.body as Partial<AgentConfig>;
    const updated = updateAgentConfig(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除Agent
agentRouter.delete('/:id', (req, res) => {
  try {
    const success = deleteAgentConfig(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted' });
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取所有Agent
agentRouter.get('/', (req, res) => {
  try {
    const agents = getAllAgentsFromDb();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// 获取单个Agent
agentRouter.get('/:id', (req, res) => {
  try {
    const agent = getAgentFromDb(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// 获取Agent配置详情
agentRouter.get('/:id/config', (req, res) => {
  try {
    const config = loadAgentConfig(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'Agent config not found' });
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching agent config:', error);
    res.status(500).json({ error: 'Failed to fetch agent config' });
  }
});

// 触发Agent执行工单
// 支持 SSE 流式：当请求 Accept: text/event-stream 时，逐条推送执行事件；
// 否则保留旧的阻塞 JSON 返回（向后兼容）。
agentRouter.post('/:id/execute', async (req, res) => {
  try {
    const agent = getAgentFromDb(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { ticketId, projectId, maxIterations, temperature } = req.body as {
      ticketId: string;
      projectId?: string;
      maxIterations?: number;
      temperature?: number;
    };

    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId is required' });
    }

    const { executeAgent } = await import('./executor.js');

    const accept = (req.headers.accept || '').toLowerCase();
    const wantStream = accept.includes('text/event-stream');

    // 旧路径：阻塞返回完整结果
    if (!wantStream) {
      const result = await executeAgent(agent, ticketId, projectId, {
        maxIterations,
        temperature
      });
      return res.json(result);
    }

    // SSE 流式响应
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    const send = (event: AgentEvent): void => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await executeAgent(agent, ticketId, projectId, {
        maxIterations,
        temperature,
        onEvent: send,
        signal: ac.signal,
      });
      // executor 末尾已发射 complete/error 事件，此处无需重复
    } catch (e: any) {
      send({ type: 'error', error: e.message, iterations: 0, timestamp: new Date().toISOString() });
    } finally {
      res.end();
    }
  } catch (error: any) {
    console.error('Error executing agent:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});
