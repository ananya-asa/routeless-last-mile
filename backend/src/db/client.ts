// ============================================================
// client.ts — Opens the SQLite connection, runs schema,
// and seeds demo data on first startup.
// All other modules import `db` from here — single connection.
// ============================================================

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH ?? join(__dirname, '../../../data/routeless.db');

// Open (or create) the SQLite database
export const db = new Database(DB_PATH);

// Performance settings
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema on every startup — safe because of IF NOT EXISTS
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Lightweight demo migrations: CREATE TABLE IF NOT EXISTS does not add new
// columns to an existing database, so bring older volumes up to date.
const helpRequestColumns = db
  .prepare('PRAGMA table_info(help_requests)')
  .all() as Array<{ name: string }>;
if (!helpRequestColumns.some((column) => column.name === 'is_exam_day')) {
  db.exec('ALTER TABLE help_requests ADD COLUMN is_exam_day INTEGER DEFAULT 0');
  console.log('[DB] Migrated help_requests.is_exam_day');
}

console.log(`[DB] Connected: ${DB_PATH}`);

