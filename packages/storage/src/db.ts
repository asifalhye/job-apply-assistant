import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteInstance: Database.Database | null = null;

export function getDataDir(): string {
  return process.env.DATA_DIR ?? './data';
}

export function getDbPath(): string {
  return `${getDataDir()}/local.db`;
}

export function getSqlite(): Database.Database {
  if (!sqliteInstance) {
    const dbPath = getDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma('journal_mode = WAL');
    sqliteInstance.pragma('foreign_keys = ON');
  }
  return sqliteInstance;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getSqlite(), { schema });
  }
  return dbInstance;
}

export { schema };
