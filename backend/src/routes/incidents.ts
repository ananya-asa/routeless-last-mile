// incidents.ts — Person 2 fills in full logic
// Stub so server starts without errors
import { Hono } from 'hono';
import { db } from '../db/client.js';
import { v4 as uuid } from 'uuid';

export const incidentRoutes = new Hono();

// GET all incidents with their villages
incidentRoutes.get('/', (c) => {
  const incidents = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all();
  const iv = db.prepare('SELECT * FROM incident_villages').all() as { incident_id: string; village_id: string }[];
  const data = incidents.map((i: any) => ({
    ...i,
    affectedVillageIds: iv.filter(v => v.incident_id === i.id).map(v => v.village_id),
  }));
  return c.json({ data });
});

// POST report a new incident (student)
incidentRoutes.post('/', async (c) => {
  const body = await c.req.json() as {
    transportOptionId: string;
    type: string;
    reportedBy: string;
    affectedVillageIds: string[];
    details?: string;
  };

  const id = `INC-${uuid().slice(0, 8).toUpperCase()}`;
  db.prepare(`
    INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
    VALUES (?, ?, ?, 'reported', ?, ?)
  `).run(id, body.transportOptionId, body.type, body.reportedBy, body.details ?? null);

  for (const vid of body.affectedVillageIds) {
    db.prepare('INSERT OR IGNORE INTO incident_villages (incident_id, village_id) VALUES (?, ?)').run(id, vid);
  }

  return c.json({ success: true, id }, 201);
});

// PATCH confirm or dismiss (coordinator)
incidentRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json() as { status: 'confirmed' | 'dismissed' };
  db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run(body.status, id);
  return c.json({ success: true });
});

