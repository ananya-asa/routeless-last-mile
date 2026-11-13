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

console.log(`[DB] Connected: ${DB_PATH}`);

