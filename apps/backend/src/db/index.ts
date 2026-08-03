// apps/backend/src/db/index.ts
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { config } from '../config/index.js';

let db: Database.Database | null = null;

function hasColumn(database: Database.Database, tableName: string, columnName: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === columnName);
}

function migrateApiKeysTable(database: Database.Database): void {
  const tableExists = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'api_keys'")
    .get();

  if (!tableExists) {
    return;
  }

  if (!hasColumn(database, 'api_keys', 'categories')) {
    database.exec("ALTER TABLE api_keys ADD COLUMN categories TEXT NOT NULL DEFAULT '[\"chat\"]'");
  }
  if (!hasColumn(database, 'api_keys', 'models')) {
    database.exec("ALTER TABLE api_keys ADD COLUMN models TEXT NOT NULL DEFAULT '[]'");
  }
}

function migrateSkillPacksTable(database: Database.Database): void {
  const tableExists = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'skill_packs'")
    .get();

  if (!tableExists) {
    return;
  }

  if (!hasColumn(database, 'skill_packs', 'file_name')) {
    database.exec("ALTER TABLE skill_packs ADD COLUMN file_name TEXT NOT NULL DEFAULT ''");
  }
  if (!hasColumn(database, 'skill_packs', 'file_path')) {
    database.exec("ALTER TABLE skill_packs ADD COLUMN file_path TEXT NOT NULL DEFAULT ''");
  }
  if (!hasColumn(database, 'skill_packs', 'file_ext')) {
    database.exec("ALTER TABLE skill_packs ADD COLUMN file_ext TEXT NOT NULL DEFAULT 'skill'");
  }
  if (!hasColumn(database, 'skill_packs', 'file_size')) {
    database.exec("ALTER TABLE skill_packs ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0");
  }
  if (!hasColumn(database, 'skill_packs', 'import_source')) {
    database.exec("ALTER TABLE skill_packs ADD COLUMN import_source TEXT NOT NULL DEFAULT 'legacy'");
  }
}

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
  const schemaPath = join(__dirname, 'schema.sql');
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

  migrateSkillPacksTable(db);
  migrateApiKeysTable(db);

  console.log('Database initialized successfully');
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
