import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { config } from '../../config/index.js';
import type { SkillPack, CreateSkillPackInput, UpdateSkillPackInput } from './types.js';

const skillsDir = join(config.dataDir, 'skills');

function ensureSkillsDir(): void {
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true });
  }
}

export function getSkillsDirPath(): string {
  ensureSkillsDir();
  return skillsDir;
}

export function createSkillPack(input: CreateSkillPackInput): SkillPack {
  const db = getDb();
  const id = input.id || uuidv4();

  const tableInfo = db.prepare('PRAGMA table_info(skill_packs)').all() as Array<{ name: string }>;
  const hasLegacyContentColumn = tableInfo.some((c) => c.name === 'content');

  if (hasLegacyContentColumn) {
    db.prepare(`
      INSERT INTO skill_packs (id, name, description, category, content, file_name, file_path, file_ext, file_size, import_source, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      input.name,
      input.description || '',
      input.category || 'general',
      '',
      input.fileName,
      input.filePath,
      input.fileExt,
      input.fileSize,
      input.importSource || 'upload'
    );
  } else {
    db.prepare(`
      INSERT INTO skill_packs (id, name, description, category, file_name, file_path, file_ext, file_size, import_source, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      input.name,
      input.description || '',
      input.category || 'general',
      input.fileName,
      input.filePath,
      input.fileExt,
      input.fileSize,
      input.importSource || 'upload'
    );
  }

  return getSkillPackById(id)!;
}

export function getSkillPackById(id: string): SkillPack | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM skill_packs WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getAllSkillPacks(): SkillPack[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM skill_packs ORDER BY category ASC, created_at DESC').all() as any[];
  return rows.map(mapRow);
}

export function getActiveSkillPacks(): SkillPack[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM skill_packs WHERE is_active = 1 ORDER BY category ASC, created_at DESC').all() as any[];
  return rows.map(mapRow);
}

export function getSkillPacksByIds(ids: string[]): SkillPack[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM skill_packs WHERE id IN (${placeholders})`).all(...ids) as any[];
  return rows.map(mapRow);
}

export function updateSkillPack(id: string, input: UpdateSkillPackInput): SkillPack | null {
  const db = getDb();
  const current = getSkillPackById(id);
  if (!current) return null;

  const name = input.name ?? current.name;
  const description = input.description ?? current.description;
  const category = input.category ?? current.category;
  const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : (current.isActive ? 1 : 0);

  db.prepare(`
    UPDATE skill_packs
    SET name = ?, description = ?, category = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, category, isActive, id);

  return getSkillPackById(id);
}

export function deleteSkillPack(id: string): boolean {
  const db = getDb();
  const existing = getSkillPackById(id);
  const result = db.prepare('DELETE FROM skill_packs WHERE id = ?').run(id);

  if (result.changes > 0 && existing?.filePath) {
    const absolute = join(config.dataDir, existing.filePath);
    if (existsSync(absolute)) {
      rmSync(absolute, { force: true });
    }
  }

  return result.changes > 0;
}

function mapRow(row: any): SkillPack {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || 'general',
    fileName: row.file_name || '',
    filePath: row.file_path || '',
    fileExt: (row.file_ext || 'skill') as 'zip' | 'skill',
    fileSize: Number(row.file_size || 0),
    importSource: (row.import_source || 'legacy') as 'upload' | 'legacy',
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
