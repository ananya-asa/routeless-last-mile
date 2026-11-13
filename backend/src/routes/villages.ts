// ============================================================
// villages.ts — GET /api/villages (camelCase contract)
// ============================================================

import { Hono } from 'hono';
import { db } from '../db/client.js';

export const villageRoutes = new Hono();

villageRoutes.get('/', (c) => {
  const rows = db
    .prepare('SELECT id, name, corridor_id FROM villages ORDER BY id')
    .all() as { id: string; name: string; corridor_id: string }[];

  return c.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      corridorId: row.corridor_id,
    })),
  });
});
