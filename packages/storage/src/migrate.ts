import { getSqlite } from './db.js';

const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT, last_name TEXT, email TEXT, phone TEXT,
    linkedin_url TEXT, github_url TEXT, portfolio_url TEXT, website_url TEXT,
    address_line1 TEXT, address_line2 TEXT, city TEXT, state TEXT, zip_code TEXT, country TEXT,
    pronouns TEXT, work_authorization TEXT,
    requires_sponsorship INTEGER, salary_min INTEGER, salary_max INTEGER,
    earliest_start_date TEXT, willing_to_relocate INTEGER,
    custom_fields TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, type TEXT NOT NULL, file_path TEXT NOT NULL,
    mime_type TEXT, is_primary INTEGER DEFAULT 0,
    parsed_text TEXT, parsed_sections TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, body TEXT NOT NULL,
    tags TEXT, category TEXT NOT NULL DEFAULT 'misc',
    source_type TEXT DEFAULT 'user', confidence REAL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_text TEXT NOT NULL, normalized_text TEXT NOT NULL UNIQUE,
    category TEXT, times_seen INTEGER DEFAULT 1,
    canonical_snippet_id INTEGER, cluster_id TEXT,
    first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT, role_title TEXT, job_url TEXT NOT NULL,
    ats_type TEXT, status TEXT DEFAULT 'draft',
    job_description TEXT, checkpoint TEXT, submitted_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS application_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    field_label TEXT NOT NULL, field_type TEXT,
    normalized_question TEXT, proposed_value TEXT, final_value TEXT,
    fill_method TEXT, confidence REAL,
    user_edited INTEGER DEFAULT 0, validation_passed INTEGER,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS field_fill_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    field_label TEXT NOT NULL, field_type TEXT,
    selected_value TEXT, fill_method TEXT, confidence REAL,
    user_edited INTEGER DEFAULT 0, validation_passed INTEGER,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workday_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL UNIQUE,
    company_name TEXT, email TEXT,
    account_status TEXT DEFAULT 'unknown',
    encrypted_credentials TEXT, last_used_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS document_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER, snippet_id INTEGER,
    section TEXT, content TEXT NOT NULL,
    embedding TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS question_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL, snippet_id INTEGER, application_id INTEGER,
    answer_text TEXT NOT NULL, source TEXT NOT NULL,
    accepted INTEGER DEFAULT 1, created_at TEXT NOT NULL
  )`,
];

export function runMigrations() {
  const sqlite = getSqlite();
  for (const stmt of CREATE_STATEMENTS) {
    sqlite.exec(stmt);
  }
  console.log('Migrations complete.');
}
