// ============================================================
// client.ts — Opens the SQLite connection, runs schema, and
// leaves seeding to the startup entry point (seed.ts).
// All other modules import `db` from here — single connection.
// ============================================================

import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH ?? join(__dirname, '../../../data/routeless.db');

// Make sure the parent directory exists before SQLite tries to create the file.
mkdirSync(dirname(DB_PATH), { recursive: true });

// Open (or create) the SQLite database.
export const db = new Database(DB_PATH);

// Performance and safety settings.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Run schema on every startup — safe because every statement is idempotent.
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

console.log(`[DB] Connected: ${DB_PATH}`);
