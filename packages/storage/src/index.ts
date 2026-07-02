export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { getDb, getDbPath, getDataDir, schema } from './db.js';
export { runMigrations } from './migrate.js';
export type * from './schema.js';
