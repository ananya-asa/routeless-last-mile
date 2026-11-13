// requests.ts — Person 2 fills in full logic. Stub for now.
import { Hono } from 'hono';
import { db } from '../db/client.js';
import { v4 as uuid } from 'uuid';

export const requestRoutes = new Hono();

requestRoutes.get('/', (c) => {
  const requests = db.prepare('SELECT * FROM help_requests ORDER BY created_at DESC').all();
  return c.json({ data: requests });
});

requestRoutes.post('/', async (c) => {
  const body = await c.req.json() as { studentId: string; incidentId: string };
  const id = `REQ-${uuid().slice(0, 8).toUpperCase()}`;

  try {
    db.prepare(`
      INSERT INTO help_requests (id, student_id, incident_id, status)
      VALUES (?, ?, ?, 'pending')
    `).run(id, body.studentId, body.incidentId);
    return c.json({ success: true, id }, 201);
  } catch {
    // UNIQUE constraint — duplicate request
    return c.json({ error: 'Request already exists for this student and incident' }, 409);
  }
});

// Escalate to school assistance
requestRoutes.patch('/:id/escalate', (c) => {
  const id = c.req.param('id');
  db.prepare(`UPDATE help_requests SET status = 'escalated' WHERE id = ?`).run(id);
  return c.json({ success: true });
});

