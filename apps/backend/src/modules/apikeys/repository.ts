import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { ApiKey, CreateApiKeyInput, UpdateApiKeyInput } from './types.js';

export function createApiKey(input: CreateApiKeyInput): ApiKey {
  const db = getDb();
  const id = uuidv4();
  const maxConcurrency = input.maxConcurrency ?? 1;
  const categories = input.categories && input.categories.length > 0
    ? JSON.stringify(input.categories)
    : JSON.stringify(['chat']);
  const models = input.models && input.models.length > 0
    ? JSON.stringify(input.models)
    : JSON.stringify([]);

  db.prepare(`
    INSERT INTO api_keys (id, provider, name, api_key, max_concurrency, is_active, categories, models)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, input.provider, input.name, input.apiKey, maxConcurrency, categories, models);

  return getApiKeyById(id)!;
}

export function getApiKeyById(id: string): ApiKey | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getAllApiKeys(): ApiKey[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as any[];
  return rows.map(mapRow);
}

export function getActiveApiKeysByProvider(provider: string): ApiKey[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM api_keys WHERE provider = ? AND is_active = 1 ORDER BY created_at ASC').all(provider) as any[];
  return rows.map(mapRow);
}

export function getAllActiveApiKeys(): ApiKey[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM api_keys WHERE is_active = 1 ORDER BY created_at ASC').all() as any[];
  return rows.map(mapRow);
}

export function getActiveKeysByCategory(category: string): ApiKey[] {
  const all = getAllActiveApiKeys();
  return all.filter(k => k.categories.includes(category));
}

export function updateApiKey(id: string, input: UpdateApiKeyInput): ApiKey | null {
  const db = getDb();
  const current = getApiKeyById(id);
  if (!current) return null;

  const provider = input.provider ?? current.provider;
  const name = input.name ?? current.name;
  const apiKey = input.apiKey ?? current.apiKey;
  const maxConcurrency = input.maxConcurrency ?? current.maxConcurrency;
  const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : (current.isActive ? 1 : 0);
  const categories = input.categories !== undefined
    ? JSON.stringify(input.categories)
    : JSON.stringify(current.categories);
  const models = input.models !== undefined
    ? JSON.stringify(input.models)
    : JSON.stringify(current.models);

  db.prepare(`
    UPDATE api_keys
    SET provider = ?, name = ?, api_key = ?, max_concurrency = ?, is_active = ?, categories = ?, models = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(provider, name, apiKey, maxConcurrency, isActive, categories, models, id);

  return getApiKeyById(id);
}

export function deleteApiKey(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  return result.changes > 0;
}

function mapRow(row: any): ApiKey {
  let categories: string[];
  try {
    categories = JSON.parse(row.categories || '["chat"]');
  } catch {
    categories = ['chat'];
  }
  let models: string[];
  try {
    models = JSON.parse(row.models || '[]');
  } catch {
    models = [];
  }

  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    apiKey: row.api_key,
    maxConcurrency: row.max_concurrency,
    isActive: !!row.is_active,
    categories,
    models,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
