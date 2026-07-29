import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { PlatformModel, CreatePlatformModelInput, UpdatePlatformModelInput } from './types.js';

export function createPlatformModel(input: CreatePlatformModelInput): PlatformModel {
  const db = getDb();
  const id = uuidv4();
  const priority = input.priority ?? 0;

  db.prepare(`
    INSERT INTO platform_models (id, provider, model_name, priority, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(id, input.provider, input.modelName, priority);

  return getPlatformModelById(id)!;
}

export function getPlatformModelById(id: string): PlatformModel | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM platform_models WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getAllPlatformModels(): PlatformModel[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM platform_models ORDER BY priority ASC, created_at ASC').all() as any[];
  return rows.map(mapRow);
}

// 获取活跃的模型列表（按优先级排序）
export function getActivePlatformModels(): PlatformModel[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM platform_models WHERE is_active = 1 ORDER BY priority ASC, created_at ASC').all() as any[];
  return rows.map(mapRow);
}

export function updatePlatformModel(id: string, input: UpdatePlatformModelInput): PlatformModel | null {
  const db = getDb();
  const current = getPlatformModelById(id);
  if (!current) return null;

  const provider = input.provider ?? current.provider;
  const modelName = input.modelName ?? current.modelName;
  const priority = input.priority ?? current.priority;
  const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : (current.isActive ? 1 : 0);

  db.prepare(`
    UPDATE platform_models
    SET provider = ?, model_name = ?, priority = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(provider, modelName, priority, isActive, id);

  return getPlatformModelById(id);
}

export function deletePlatformModel(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM platform_models WHERE id = ?').run(id);
  return result.changes > 0;
}

function mapRow(row: any): PlatformModel {
  return {
    id: row.id,
    provider: row.provider,
    modelName: row.model_name,
    priority: row.priority,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
