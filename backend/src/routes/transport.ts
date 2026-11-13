// transport.ts — GET /api/transport, PATCH /api/transport/:id
import { Hono } from 'hono';
import { db } from '../db/client.js';

export const transportRoutes = new Hono();

// Get all transport options with their villages
transportRoutes.get('/', (c) => {
  const options = db.prepare('SELECT * FROM transport_options').all();
  const villages = db.prepare('SELECT * FROM transport_villages').all() as { transport_id: string; village_id: string }[];

  const data = options.map((t: any) => ({
    ...t,
    verified: t.verified === 1,
    accessible: t.accessible === 1,
    villageIds: villages.filter(v => v.transport_id === t.id).map(v => v.village_id),
  }));

  return c.json({ data });
});

// Update occupied seats or status (coordinator only in demo)
transportRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json() as { occupied_seats?: number; status?: string };

  const transport = db.prepare('SELECT * FROM transport_options WHERE id = ?').get(id) as any;
  if (!transport) return c.json({ error: 'Transport not found' }, 404);

  if (body.occupied_seats !== undefined) {
    if (body.occupied_seats < 0 || body.occupied_seats > transport.capacity) {
      return c.json({ error: 'Invalid seat count' }, 400);
    }
    db.prepare('UPDATE transport_options SET occupied_seats = ? WHERE id = ?').run(body.occupied_seats, id);
  }

  if (body.status !== undefined) {
    db.prepare('UPDATE transport_options SET status = ? WHERE id = ?').run(body.status, id);
  }

  return c.json({ success: true });
});

