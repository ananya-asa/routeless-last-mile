// villages.ts — GET /api/villages
import { Hono } from 'hono';
import { db } from '../db/client.js';

export const villageRoutes = new Hono();

villageRoutes.get('/', (c) => {
  const villages = db.prepare('SELECT * FROM villages').all();
  return c.json({ data: villages });
});

