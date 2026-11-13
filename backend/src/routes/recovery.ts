// recovery.ts — Route for running allocation engine & approving proposals
import { Hono } from 'hono';
import { db } from '../db/client.js';
import { runRecoveryEngine } from '../domain/recoveryEngine.js';
import { broadcast } from './events.js';

export const recoveryRoutes = new Hono();

// POST /api/recovery/run — Run the recovery engine & return draft proposals
recoveryRoutes.post('/run', async (c) => {
  const result = runRecoveryEngine();
  return c.json(result);
});

// POST /api/recovery/approve — Approve the proposal and write to assignments table atomically
recoveryRoutes.post('/approve', async (c) => {
  const body = await c.req.json() as { proposals: { requestId: string; transportOptionId: string; explanation: string }[] };

  const insertAssignment = db.prepare(`
    INSERT OR REPLACE INTO assignments (id, request_id, transport_option_id, status, explanation)
    VALUES (?, ?, ?, 'confirmed', ?)
  `);

  const updateRequestStatus = db.prepare(`
    UPDATE help_requests SET status = 'confirmed' WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    for (const p of body.proposals) {
      const assignmentId = `ASG-${p.requestId}`;
      insertAssignment.run(assignmentId, p.requestId, p.transportOptionId, p.explanation);
      updateRequestStatus.run(p.requestId);
    }
  });

  transaction();
  broadcast({ type: 'assignments_updated' });

  return c.json({ success: true, count: body.proposals.length });
});

