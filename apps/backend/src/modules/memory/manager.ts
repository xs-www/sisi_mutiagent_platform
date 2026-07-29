// apps/backend/src/modules/memory/manager.ts
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { AgentMemory, CreateMemoryInput } from './types.js';

export function addMemory(input: CreateMemoryInput): AgentMemory {
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO agent_memories (id, agent_id, project_id, memory_type, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.agentId, input.projectId || null, input.memoryType, input.content);

  return getMemoryById(id)!;
}

export function getMemoryById(id: string): AgentMemory | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agent_memories WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getGlobalMemories(agentId: string): AgentMemory[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agent_memories WHERE agent_id = ? AND memory_type = ? ORDER BY created_at DESC').all(agentId, 'global') as any[];
  return rows.map(mapRow);
}

export function getProjectMemories(agentId: string, projectId: string): AgentMemory[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agent_memories WHERE agent_id = ? AND project_id = ? AND memory_type = ? ORDER BY created_at DESC').all(agentId, projectId, 'project') as any[];
  return rows.map(mapRow);
}

export function getAllMemories(agentId: string, projectId?: string): { global: AgentMemory[]; project: AgentMemory[] } {
  return {
    global: getGlobalMemories(agentId),
    project: projectId ? getProjectMemories(agentId, projectId) : []
  };
}

export function deleteMemory(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM agent_memories WHERE id = ?').run(id);
  return result.changes > 0;
}

export function clearProjectMemories(agentId: string, projectId: string): number {
  const db = getDb();
  const result = db.prepare('DELETE FROM agent_memories WHERE agent_id = ? AND project_id = ? AND memory_type = ?').run(agentId, projectId, 'project');
  return result.changes;
}

// 将记忆格式化为Prompt文本
export function formatMemoriesForPrompt(agentId: string, projectId?: string): string {
  const memories = getAllMemories(agentId, projectId);
  const lines: string[] = [];

  if (memories.global.length > 0) {
    lines.push('## 全局记忆');
    for (const m of memories.global) {
      lines.push(`- ${m.content}`);
    }
  }

  if (memories.project.length > 0) {
    lines.push('## 项目记忆');
    for (const m of memories.project) {
      lines.push(`- ${m.content}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : '（暂无记忆）';
}

function mapRow(row: any): AgentMemory {
  return {
    id: row.id,
    agentId: row.agent_id,
    projectId: row.project_id,
    memoryType: row.memory_type,
    content: row.content,
    createdAt: row.created_at
  };
}
