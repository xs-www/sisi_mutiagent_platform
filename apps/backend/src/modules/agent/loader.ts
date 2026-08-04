// apps/backend/src/modules/agent/loader.ts
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'fs';
import { join, sep } from 'path';
import { config } from '../../config/index.js';
import type { AgentConfig, Agent, AgentToolsConfig } from './types.js';
import { getDb } from '../../db/index.js';

// Agent 命名空间：内置（builtin）与用户自定义（custom）
export const AGENT_NAMESPACES = ['builtin', 'custom'] as const;
export type AgentNamespace = (typeof AGENT_NAMESPACES)[number];

// 新格式文件名约定：agent.yaml（基础信息）+ prompt.md（长 system prompt）+ tools.yaml（工具配置）
const AGENT_YAML_FILE = 'agent.yaml';
const PROMPT_MD_FILE = 'prompt.md';
const TOOLS_YAML_FILE = 'tools.yaml';
// 旧格式文件名（仅用于兼容迁移）
const CONFIG_YAML_FILE = 'config.yaml';
const LEGACY_MARKDOWN_SUFFIX = '.agent.md';

function getAgentsRoot(): string {
  return join(config.dataDir, 'agents');
}

function getNamespaceDir(namespace: AgentNamespace): string {
  return join(getAgentsRoot(), namespace);
}

function getAgentDir(agentId: string): string | null {
  for (const ns of AGENT_NAMESPACES) {
    const dir = join(getNamespaceDir(ns), agentId);
    if (existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

function getAgentNamespace(agentDir: string): AgentNamespace {
  return agentDir.startsWith(getNamespaceDir('builtin') + sep) ? 'builtin' : 'custom';
}

// ==================== 新格式读取 ====================

function readAgentFromDir(agentDir: string, agentId: string): AgentConfig | null {
  const yamlPath = join(agentDir, AGENT_YAML_FILE);
  if (!existsSync(yamlPath)) {
    return null;
  }

  const base = parseYaml(readFileSync(yamlPath, 'utf-8')) as Partial<AgentConfig>;

  // system prompt 从 prompt.md 读取（缺失时回退到 agent.yaml 的 prompt.system）
  let system = base.prompt?.system || '';
  const promptPath = join(agentDir, PROMPT_MD_FILE);
  if (existsSync(promptPath)) {
    system = readFileSync(promptPath, 'utf-8').trim();
  }

  // 工具配置从 tools.yaml 读取（缺失时回退到 agent.yaml 的 tools）
  let tools: AgentToolsConfig = base.tools || { predefined: [] };
  const toolsPath = join(agentDir, TOOLS_YAML_FILE);
  if (existsSync(toolsPath)) {
    const parsed = parseYaml(readFileSync(toolsPath, 'utf-8')) as any;
    if (Array.isArray(parsed)) {
      // 兼容：tools.yaml 直接为工具名数组
      tools = { predefined: parsed as string[] };
    } else {
      tools = {
        predefined: Array.isArray(parsed?.predefined) ? parsed.predefined : [],
        approvalRequired: Array.isArray(parsed?.approvalRequired) ? parsed.approvalRequired : undefined,
        custom: Array.isArray(parsed?.custom) ? parsed.custom : undefined,
      };
    }
  }

  const predefinedTools = tools.predefined || [];
  // 未显式声明审批清单时，默认对危险工具要求审批
  const approvalRequired = tools.approvalRequired && tools.approvalRequired.length > 0
    ? tools.approvalRequired
    : predefinedTools.filter((name) => ['file_delete', 'shell_execute'].includes(name));

  const memory = base.memory || { global: true, project: true };

  return {
    id: agentId,
    name: base.name || agentId,
    description: base.description || '',
    role: base.role || 'specialist',
    prompt: {
      system,
      personality: base.prompt?.personality,
    },
    tools: {
      predefined: predefinedTools,
      approvalRequired,
      custom: tools.custom || [],
    },
    memory: {
      global: memory.global ?? true,
      project: memory.project ?? true,
    },
    skills: base.skills || [],
    instructions: base.instructions || {},
  };
}

// ==================== 旧格式读取（兼容迁移） ====================

function parseMarkdownAgent(markdown: string, agentId: string): AgentConfig | null {
  const lines = markdown.split(/\r?\n/);
  const firstDelimiter = lines.findIndex((line) => line.trim() === '---');
  if (firstDelimiter < 0) {
    return null;
  }

  const secondDelimiter = lines.findIndex((line, index) => index > firstDelimiter && line.trim() === '---');
  if (secondDelimiter < 0) {
    return null;
  }

  const frontMatter = lines.slice(firstDelimiter + 1, secondDelimiter).join('\n');
  const body = lines.slice(secondDelimiter + 1).join('\n');
  const metadata = (parseYaml(frontMatter) || {}) as Partial<AgentConfig>;

  const sections: Record<string, string> = {};
  let currentSection: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s*(.+)$/);
    if (heading) {
      currentSection = heading[1].trim();
      sections[currentSection] = '';
      continue;
    }

    if (currentSection) {
      sections[currentSection] += `${line}\n`;
    }
  }

  const prompt = metadata.prompt || { system: '' };
  const toolsInput = metadata.tools as any;
  const approvalRequiredInput = Array.isArray((metadata as any).approvalRequired)
    ? (metadata as any).approvalRequired as string[]
    : Array.isArray(toolsInput?.approvalRequired)
      ? toolsInput.approvalRequired as string[]
      : [];
  const predefinedTools = Array.isArray(toolsInput)
    ? toolsInput as string[]
    : (toolsInput?.predefined as string[] | undefined) || [];
  const customTools = Array.isArray(toolsInput?.custom) ? toolsInput.custom as string[] : [];
  const memory = metadata.memory || { global: true, project: true };
  const instructions = metadata.instructions || {};

  const normalizedApprovalRequired = approvalRequiredInput.length > 0
    ? approvalRequiredInput
    : predefinedTools.filter((name) => ['file_delete', 'shell_execute'].includes(name));

  return {
    id: agentId,
    name: metadata.name || agentId,
    description: metadata.description || '',
    role: metadata.role || 'specialist',
    prompt: {
      system: prompt.system || '',
      personality: prompt.personality,
    },
    tools: {
      predefined: predefinedTools,
      approvalRequired: normalizedApprovalRequired,
      custom: customTools,
    },
    memory: {
      global: memory.global ?? true,
      project: memory.project ?? true,
    },
    skills: metadata.skills || [],
    instructions: {
      goal: instructions.goal || sections['目标']?.trim(),
      constraints: instructions.constraints || sections['约束']?.trim(),
      methods: instructions.methods || sections['工作方法']?.trim(),
      outputFormat: instructions.outputFormat || sections['输出格式']?.trim(),
      refusalStrategy: instructions.refusalStrategy || sections['拒绝策略']?.trim(),
    },
  };
}

function readLegacyAgent(agentDir: string, agentId: string): AgentConfig | null {
  const markdownPath = join(agentDir, `${agentId}${LEGACY_MARKDOWN_SUFFIX}`);
  if (existsSync(markdownPath)) {
    const markdownConfig = parseMarkdownAgent(readFileSync(markdownPath, 'utf-8'), agentId);
    if (markdownConfig) {
      return markdownConfig;
    }
  }

  const configPath = join(agentDir, CONFIG_YAML_FILE);
  if (!existsSync(configPath)) {
    return null;
  }

  const parsed = parseYaml(readFileSync(configPath, 'utf-8')) as AgentConfig;
  return {
    ...parsed,
    id: agentId,
    name: parsed.name || agentId,
    description: parsed.description || '',
    role: parsed.role || 'specialist',
    prompt: parsed.prompt || { system: '' },
    tools: parsed.tools || { predefined: [] },
    memory: parsed.memory || { global: true, project: true },
    skills: parsed.skills || [],
    instructions: parsed.instructions || {},
  };
}

// ==================== 写入（新格式） ====================

function writeAgentFiles(agentConfig: AgentConfig): { agentDir: string; configPath: string } {
  const existingDir = getAgentDir(agentConfig.id);
  const agentDir = existingDir || join(getNamespaceDir('custom'), agentConfig.id);
  mkdirSync(agentDir, { recursive: true });

  const agentYaml = {
    id: agentConfig.id,
    name: agentConfig.name,
    description: agentConfig.description || '',
    role: agentConfig.role,
    prompt: agentConfig.prompt?.personality ? { personality: agentConfig.prompt.personality } : undefined,
    memory: agentConfig.memory,
    skills: agentConfig.skills || [],
    instructions: agentConfig.instructions || {},
  };

  writeFileSync(join(agentDir, AGENT_YAML_FILE), stringifyYaml(agentYaml), 'utf-8');
  writeFileSync(join(agentDir, PROMPT_MD_FILE), agentConfig.prompt?.system || '', 'utf-8');
  writeFileSync(join(agentDir, TOOLS_YAML_FILE), stringifyYaml(agentConfig.tools || { predefined: [] }), 'utf-8');

  return { agentDir, configPath: join(agentDir, AGENT_YAML_FILE) };
}

// ==================== 对外 API ====================

export function loadAgentConfig(agentId: string): AgentConfig | null {
  const agentDir = getAgentDir(agentId);
  if (!agentDir) {
    return null;
  }

  // 优先读取新格式
  const config = readAgentFromDir(agentDir, agentId);
  if (config) {
    return config;
  }

  // 旧格式兜底：读取后自动迁移为新格式
  const legacy = readLegacyAgent(agentDir, agentId);
  if (legacy) {
    writeAgentFiles(legacy);
    return legacy;
  }

  return null;
}

export function loadAllAgents(): AgentConfig[] {
  const agents: AgentConfig[] = [];

  for (const ns of AGENT_NAMESPACES) {
    const nsDir = getNamespaceDir(ns);
    if (!existsSync(nsDir)) {
      continue;
    }

    const agentDirs = readdirSync(nsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const agentId of agentDirs) {
      const config = loadAgentConfig(agentId);
      if (config) {
        agents.push(config);
      }
    }
  }

  return agents;
}

// 获取所有内置 Agent 的 ID 列表（用于项目创建时自动加入成员）
export function getBuiltinAgentIds(): string[] {
  const builtinDir = getNamespaceDir('builtin');
  if (!existsSync(builtinDir)) {
    return [];
  }
  return readdirSync(builtinDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

export function syncAgentsToDb(): void {
  const db = getDb();
  const configs = loadAllAgents();

  const upsertStmt = db.prepare(`
    INSERT INTO agents (id, name, role, config_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      config_path = excluded.config_path,
      updated_at = datetime('now')
  `);

  for (const agentConfig of configs) {
    const agentDir = getAgentDir(agentConfig.id);
    const configPath = agentDir ? join(agentDir, AGENT_YAML_FILE) : '';
    upsertStmt.run(agentConfig.id, agentConfig.name, agentConfig.role, configPath);
  }

  console.log(`Synced ${configs.length} agents to database`);
}

export function getAgentFromDb(agentId: string): Agent | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any;

  if (!row) {
    return null;
  }

  const config = loadAgentConfig(agentId);
  if (!config) {
    return null;
  }

  const agentDir = getAgentDir(agentId);

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    configPath: row.config_path,
    config,
    isBuiltin: agentDir ? getAgentNamespace(agentDir) === 'builtin' : false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export function getAllAgentsFromDb(): Agent[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agents').all() as any[];

  return rows.map(row => {
    const config = loadAgentConfig(row.id);
    const agentDir = getAgentDir(row.id);
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      configPath: row.config_path,
      config: config!,
      isBuiltin: agentDir ? getAgentNamespace(agentDir) === 'builtin' : false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }).filter(agent => agent.config);
}

export function createAgentConfig(agentConfig: AgentConfig): Agent {
  if (getAgentDir(agentConfig.id)) {
    throw new Error(`Agent "${agentConfig.id}" already exists`);
  }

  const { configPath } = writeAgentFiles(agentConfig);

  const db = getDb();
  db.prepare(`
    INSERT INTO agents (id, name, role, config_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(agentConfig.id, agentConfig.name, agentConfig.role, configPath);

  return {
    id: agentConfig.id,
    name: agentConfig.name,
    role: agentConfig.role,
    configPath,
    config: agentConfig,
    isBuiltin: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function deleteAgentConfig(agentId: string): boolean {
  const agentDir = getAgentDir(agentId);
  if (!agentDir) {
    return false;
  }

  rmSync(agentDir, { recursive: true, force: true });

  const db = getDb();
  db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);

  return true;
}

export function updateAgentConfig(agentId: string, updates: Partial<AgentConfig>): Agent | null {
  const existing = getAgentFromDb(agentId);
  if (!existing) return null;

  // 合并更新
  const merged: AgentConfig = {
    ...existing.config,
    ...updates,
    id: existing.config.id, // 不允许修改 id
    prompt: { ...existing.config.prompt, ...updates.prompt },
    tools: { ...existing.config.tools, ...updates.tools },
    memory: { ...existing.config.memory, ...updates.memory },
  };

  writeAgentFiles(merged);

  // 更新数据库
  const db = getDb();
  db.prepare(`
    UPDATE agents SET name = ?, role = ?, updated_at = datetime('now') WHERE id = ?
  `).run(merged.name, merged.role, agentId);

  return getAgentFromDb(agentId);
}
