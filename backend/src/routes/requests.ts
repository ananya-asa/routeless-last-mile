// ============================================================
// requests.ts — Person 2 help-request lifecycle.
// pending → proposed/confirmed/unserved → escalated
// ============================================================

import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { db } from '../db/client.js';
import { broadcast } from './events.js';
import { DEMO_NOW_MIN } from './recoveryData.js';

export const requestRoutes = new Hono();

interface RequestRow {
  id: string;
  student_id: string;
  incident_id: string;
  status: string;
  is_exam_day: number | null;
  created_at: string | null;
  assigned_option_id: string | null;
}

interface IncidentRow {
  id: string;
  status: string;
}

function toRequest(row: RequestRow) {
  return {
    id: row.id,
    studentId: row.student_id,
    incidentId: row.incident_id,
    status: row.status,
    isExamDay: row.is_exam_day === 1,
    assignedOptionId: row.assigned_option_id ?? undefined,
    // The demo uses a fixed 08:00 clock rather than wall-clock time.
    createdAtMin: DEMO_NOW_MIN,
  };
}

// ── GET /api/requests ────────────────────────────────────────
requestRoutes.get('/', (c) => {
  const rows = db
    .prepare(
      `SELECT r.id, r.student_id, r.incident_id, r.status, r.is_exam_day, r.created_at,
              a.transport_option_id AS assigned_option_id
       FROM help_requests r
       LEFT JOIN assignments a
         ON a.request_id = r.id AND a.status = 'confirmed'
       ORDER BY r.created_at DESC, r.id DESC`,
    )
    .all() as RequestRow[];

  return c.json({ data: rows.map(toRequest) });
});

// ── POST /api/requests ───────────────────────────────────────
// Body: { studentId, incidentId }
requestRoutes.post('/', async (c) => {
  let body: { studentId?: unknown; incidentId?: unknown };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const incidentId = typeof body.incidentId === 'string' ? body.incidentId.trim() : '';

  if (!studentId || !incidentId) {
    return c.json({ error: 'studentId and incidentId are required.' }, 400);
  }

  const incident = db
    .prepare('SELECT id, status FROM incidents WHERE id = ?')
    .get(incidentId) as IncidentRow | undefined;
  if (!incident) {
    return c.json({ error: `Unknown incident: ${incidentId}.` }, 404);
  }
  if (incident.status === 'dismissed') {
    return c.json({ error: 'Cannot request help for a dismissed incident.' }, 409);
  }

  const id = `REQ-${uuid().slice(0, 8).toUpperCase()}`;

  try {
    db.prepare(`
      INSERT INTO help_requests (id, student_id, incident_id, status)
      VALUES (?, ?, ?, 'pending')
    `).run(id, studentId, incidentId);
  } catch {
    // UNIQUE(student_id, incident_id) prevents duplicate requests.
    return c.json(
      { error: 'Request already exists for this student and incident.' },
      409,
    );
  }

  broadcast({
    type: 'request_created',
    requestId: id,
    studentId,
    incidentId,
  });

  return c.json(
    {
      success: true,
      id,
      data: {
        id,
        studentId,
        incidentId,
        status: 'pending',
        createdAtMin: DEMO_NOW_MIN,
      },
    },
    201,
  );
});

// ── PATCH /api/requests/:id/escalate ─────────────────────────
// In-app school assistance request. No SMS/WhatsApp is sent.
requestRoutes.patch('/:id/escalate', (c) => {
  const id = c.req.param('id');

  const request = db
    .prepare('SELECT id, student_id, incident_id, status FROM help_requests WHERE id = ?')
    .get(id) as
    | { id: string; student_id: string; incident_id: string; status: string }
    | undefined;
  if (!request) {
    return c.json({ error: 'Request not found.' }, 404);
  }

  if (request.status === 'confirmed') {
    return c.json(
      { error: 'This student already has a confirmed seat and cannot be escalated.' },
      409,
    );
  }

  if (request.status !== 'escalated') {
    db.prepare(`UPDATE help_requests SET status = 'escalated' WHERE id = ?`).run(id);
    broadcast({
      type: 'request_escalated',
      requestId: id,
      studentId: request.student_id,
      incidentId: request.incident_id,
    });
  }

  return c.json({ success: true, id, status: 'escalated' });
});
