// apps/backend/src/modules/agent/loader.ts
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { config } from '../../config/index.js';
import type { AgentConfig, Agent } from './types.js';
import { getDb } from '../../db/index.js';

function getAgentsDir(): string {
  return join(config.dataDir, 'agents');
}

function getAgentDir(agentId: string): string {
  const canonicalDir = join(getAgentsDir(), agentId);
  if (existsSync(canonicalDir)) {
    return canonicalDir;
  }

  const legacyDir = join(config.dataDir, agentId);
  if (existsSync(legacyDir)) {
    return legacyDir;
  }

  return canonicalDir;
}

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

function readMarkdownAgent(agentId: string): AgentConfig | null {
  const agentDir = getAgentDir(agentId);
  const markdownPath = join(agentDir, `${agentId}.agent.md`);
  if (!existsSync(markdownPath)) {
    return null;
  }

  const markdown = readFileSync(markdownPath, 'utf-8');
  return parseMarkdownAgent(markdown, agentId);
}

function writeAgentFiles(agentConfig: AgentConfig): { markdownPath: string; configPath: string } {
  const existingDir = getAgentDir(agentConfig.id);
  const agentDir = existsSync(existingDir) && existingDir !== join(getAgentsDir(), agentConfig.id)
    ? existingDir
    : join(getAgentsDir(), agentConfig.id);
  mkdirSync(agentDir, { recursive: true });

  const markdownPath = join(agentDir, `${agentConfig.id}.agent.md`);
  const configPath = join(agentDir, 'config.yaml');

  const frontMatter = {
    name: agentConfig.name,
    description: agentConfig.description || '',
    role: agentConfig.role,
    prompt: agentConfig.prompt,
    tools: agentConfig.tools.predefined || [],
    approvalRequired: agentConfig.tools.approvalRequired || [],
    memory: agentConfig.memory,
    skills: agentConfig.skills || [],
    instructions: agentConfig.instructions || {},
  };

  const sections = [
    agentConfig.instructions?.goal ? ['## 目标', agentConfig.instructions.goal, ''] : [],
    agentConfig.instructions?.constraints ? ['## 约束', agentConfig.instructions.constraints, ''] : [],
    agentConfig.instructions?.methods ? ['## 工作方法', agentConfig.instructions.methods, ''] : [],
    agentConfig.instructions?.outputFormat ? ['## 输出格式', agentConfig.instructions.outputFormat, ''] : [],
    agentConfig.instructions?.refusalStrategy ? ['## 拒绝策略', agentConfig.instructions.refusalStrategy, ''] : [],
  ].flat();

  const markdown = ['---', stringifyYaml(frontMatter).trim(), '---', '', ...sections].join('\n');

  writeFileSync(markdownPath, markdown, 'utf-8');
  writeFileSync(configPath, stringifyYaml(agentConfig), 'utf-8');

  return { markdownPath, configPath };
}

export function loadAgentConfig(agentId: string): AgentConfig | null {
  const markdownConfig = readMarkdownAgent(agentId);
  if (markdownConfig) {
    const configPath = join(getAgentDir(agentId), 'config.yaml');
    if (!existsSync(configPath)) {
      writeAgentFiles(markdownConfig);
    }
    return markdownConfig;
  }

  const configPath = join(getAgentsDir(), agentId, 'config.yaml');
  if (!existsSync(configPath)) {
    return null;
  }

  const content = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(content) as AgentConfig;
  const normalized: AgentConfig = {
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
  writeAgentFiles(normalized);
  return normalized;
}

export function loadAllAgents(): AgentConfig[] {
  const agentsDir = getAgentsDir();
  if (!existsSync(agentsDir)) {
    return [];
  }

  const agentDirs = readdirSync(agentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const agents: AgentConfig[] = [];

  for (const agentId of agentDirs) {
    const config = loadAgentConfig(agentId);
    if (config) {
      agents.push(config);
    }
  }

  return agents;
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
      updated_at = datetime('now')
  `);

  for (const agentConfig of configs) {
    const configPath = join(getAgentsDir(), agentConfig.id, 'config.yaml');
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

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    configPath: row.config_path,
    config,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export function getAllAgentsFromDb(): Agent[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agents').all() as any[];

  return rows.map(row => {
    const config = loadAgentConfig(row.id);
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      configPath: row.config_path,
      config: config!,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }).filter(agent => agent.config);
}

export function createAgentConfig(agentConfig: AgentConfig): Agent {
  const agentDir = join(getAgentsDir(), agentConfig.id);
  if (existsSync(agentDir)) {
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
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function deleteAgentConfig(agentId: string): boolean {
  const agentDir = join(getAgentsDir(), agentId);
  if (!existsSync(agentDir)) {
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

  const { configPath } = writeAgentFiles(merged);

  // 更新数据库
  const db = getDb();
  db.prepare(`
    UPDATE agents SET name = ?, role = ?, updated_at = datetime('now') WHERE id = ?
  `).run(merged.name, merged.role, agentId);

  return getAgentFromDb(agentId);
}
