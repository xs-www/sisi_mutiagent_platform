// apps/backend/src/db/index.ts
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { config } from '../config/index.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function initDb(): Database.Database {
  const dbPath = join(config.dataDir, 'platform.db');
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new Database(dbPath);

  // 启用外键约束
  db.pragma('journal_mode = WAL');

  // 执行建表语句
  const schemaPath = join(import.meta.dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // 移除单行注释，然后分割并执行每条SQL语句
  const cleanSchema = schema
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSchema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    db.exec(statement);
  }

  console.log('Database initialized successfully');
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
