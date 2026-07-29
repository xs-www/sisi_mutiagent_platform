// apps/backend/src/modules/agent/loader.ts
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { config } from '../../config/index.js';
import type { AgentConfig, Agent } from './types.js';
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const agentsDir = join(config.dataDir, 'agents');

export function loadAgentConfig(agentId: string): AgentConfig | null {
  const configPath = join(agentsDir, agentId, 'config.yaml');

  if (!existsSync(configPath)) {
    return null;
  }

  const content = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(content);

  // 处理环境变量引用
  if (parsed.model?.apiKey?.startsWith('${ENV:')) {
    const envVar = parsed.model.apiKey.match(/\$\{ENV:(\w+)\}/)?.[1];
    if (envVar) {
      parsed.model.apiKey = process.env[envVar] || '';
    }
  }

  return parsed as AgentConfig;
}

export function loadAllAgents(): AgentConfig[] {
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
    const configPath = join(agentsDir, agentConfig.id, 'config.yaml');
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
  const agentDir = join(agentsDir, agentConfig.id);
  if (existsSync(agentDir)) {
    throw new Error(`Agent "${agentConfig.id}" already exists`);
  }

  mkdirSync(agentDir, { recursive: true });
  const configPath = join(agentDir, 'config.yaml');
  writeFileSync(configPath, stringifyYaml(agentConfig), 'utf-8');

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
  const agentDir = join(agentsDir, agentId);
  if (!existsSync(agentDir)) {
    return false;
  }

  rmSync(agentDir, { recursive: true, force: true });

  const db = getDb();
  db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);

  return true;
}
