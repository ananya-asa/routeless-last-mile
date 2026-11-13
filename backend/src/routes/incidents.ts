// ============================================================
// incidents.ts — Person 2 incident reporting + coordinator verification.
// Student reports start as `reported`; only confirmed incidents
// are visible to the recovery engine.
// ============================================================

import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { db } from '../db/client.js';
import { broadcast } from './events.js';
import { DEMO_NOW_MIN } from './recoveryData.js';

export const incidentRoutes = new Hono();

const INCIDENT_TYPES = new Set(['no_show', 'full', 'breakdown', 'delay', 'road_block']);

interface IncidentRow {
  id: string;
  transport_option_id: string;
  type: string;
  status: string;
  reported_by: string;
  details: string | null;
  created_at: string | null;
}

interface IncidentVillageRow {
  incident_id: string;
  village_id: string;
}

interface TransportRow {
  id: string;
  status: string;
}

function toIncident(row: IncidentRow, affectedVillageIds: string[]) {
  return {
    id: row.id,
    transportOptionId: row.transport_option_id,
    type: row.type,
    status: row.status,
    reportedBy: row.reported_by,
    affectedVillageIds,
    details: row.details ?? undefined,
    // The demo uses a fixed 08:00 clock rather than wall-clock time.
    reportedAtMin: DEMO_NOW_MIN,
  };
}

function villagesForIncidents(): Map<string, string[]> {
  const rows = db
    .prepare('SELECT incident_id, village_id FROM incident_villages ORDER BY village_id')
    .all() as IncidentVillageRow[];
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.incident_id) ?? [];
    list.push(row.village_id);
    map.set(row.incident_id, list);
  }
  return map;
}

// ── GET /api/incidents ───────────────────────────────────────
incidentRoutes.get('/', (c) => {
  const rows = db
    .prepare(
      `SELECT id, transport_option_id, type, status, reported_by, details, created_at
       FROM incidents
       ORDER BY created_at DESC, id DESC`,
    )
    .all() as IncidentRow[];
  const villages = villagesForIncidents();

  return c.json({
    data: rows.map((row) => toIncident(row, villages.get(row.id) ?? [])),
  });
});

// ── POST /api/incidents ──────────────────────────────────────
// Body: { transportOptionId, type, reportedBy?, affectedVillageIds?, details? }
incidentRoutes.post('/', async (c) => {
  let body: {
    transportOptionId?: unknown;
    type?: unknown;
    reportedBy?: unknown;
    affectedVillageIds?: unknown;
    details?: unknown;
  };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const transportOptionId =
    typeof body.transportOptionId === 'string' ? body.transportOptionId.trim() : '';
  if (!transportOptionId) {
    return c.json({ error: 'transportOptionId is required.' }, 400);
  }

  const type = typeof body.type === 'string' ? body.type.trim() : '';
  if (!INCIDENT_TYPES.has(type)) {
    return c.json(
      { error: `type must be one of: ${[...INCIDENT_TYPES].join(', ')}.` },
      400,
    );
  }

  const transport = db
    .prepare('SELECT id, status FROM transport_options WHERE id = ?')
    .get(transportOptionId) as TransportRow | undefined;
  if (!transport) {
    return c.json({ error: `Unknown transport option: ${transportOptionId}.` }, 404);
  }

  const reportedBy =
    typeof body.reportedBy === 'string' && body.reportedBy.toLowerCase() === 'coordinator'
      ? 'coordinator'
      : 'student';

  const details =
    typeof body.details === 'string' ? body.details.trim().slice(0, 500) : null;

  let affectedVillageIds: string[] = [];
  if (body.affectedVillageIds !== undefined) {
    if (
      !Array.isArray(body.affectedVillageIds) ||
      body.affectedVillageIds.some((id) => typeof id !== 'string')
    ) {
      return c.json({ error: 'affectedVillageIds must be an array of village ids.' }, 400);
    }
    affectedVillageIds = [...new Set(body.affectedVillageIds as string[])];
  }

  if (affectedVillageIds.length === 0) {
    // Default to every village served by the disrupted vehicle.
    const routeRows = db
      .prepare('SELECT village_id FROM transport_villages WHERE transport_id = ? ORDER BY village_id')
      .all(transportOptionId) as { village_id: string }[];
    affectedVillageIds = routeRows.map((row) => row.village_id);
  }

  if (affectedVillageIds.length === 0) {
    return c.json({ error: 'At least one affected village is required.' }, 400);
  }

  const knownVillages = new Set(
    (db.prepare('SELECT id FROM villages').all() as { id: string }[]).map((row) => row.id),
  );
  const unknownVillage = affectedVillageIds.find((id) => !knownVillages.has(id));
  if (unknownVillage) {
    return c.json({ error: `Unknown village: ${unknownVillage}.` }, 400);
  }

  const id = `INC-${uuid().slice(0, 8).toUpperCase()}`;

  const insertIncident = db.prepare(`
    INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
    VALUES (?, ?, ?, 'reported', ?, ?)
  `);
  const insertVillage = db.prepare(
    'INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)',
  );

  db.transaction(() => {
    insertIncident.run(id, transportOptionId, type, reportedBy, details);
    for (const villageId of affectedVillageIds) {
      insertVillage.run(id, villageId);
    }
  })();

  broadcast({
    type: 'incident_reported',
    incidentId: id,
    transportOptionId,
    incidentType: type,
    affectedVillageIds,
  });

  return c.json(
    {
      success: true,
      id,
      data: {
        id,
        transportOptionId,
        type,
        status: 'reported',
        reportedBy,
        affectedVillageIds,
        details: details ?? undefined,
        reportedAtMin: DEMO_NOW_MIN,
      },
    },
    201,
  );
});

// ── PATCH /api/incidents/:id ─────────────────────────────────
// Body: { status: 'confirmed' | 'dismissed' }
incidentRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');

  let body: { status?: unknown };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const status = typeof body.status === 'string' ? body.status : '';
  if (status !== 'confirmed' && status !== 'dismissed') {
    return c.json({ error: "status must be 'confirmed' or 'dismissed'." }, 400);
  }

  const incident = db
    .prepare('SELECT id, transport_option_id, type, status FROM incidents WHERE id = ?')
    .get(id) as
    | { id: string; transport_option_id: string; type: string; status: string }
    | undefined;
  if (!incident) {
    return c.json({ error: 'Incident not found.' }, 404);
  }

  const updateIncident = db.prepare('UPDATE incidents SET status = ? WHERE id = ?');
  const cancelTransport = db.prepare(
    `UPDATE transport_options SET status = 'cancelled' WHERE id = ?`,
  );
  const delayTransport = db.prepare(
    `UPDATE transport_options SET status = 'delayed' WHERE id = ?`,
  );
  const restoreTransport = db.prepare(`
    UPDATE transport_options
    SET status = 'active'
    WHERE id = ?
      AND status IN ('cancelled', 'delayed')
      AND NOT EXISTS (
        SELECT 1 FROM incidents
        WHERE transport_option_id = ?
          AND status = 'confirmed'
          AND id <> ?
      )
  `);

  db.transaction(() => {
    updateIncident.run(status, id);

    if (status === 'confirmed') {
      // Mirror the disruption onto the vehicle so the inventory stays honest.
      if (incident.type === 'delay') {
        delayTransport.run(incident.transport_option_id);
      } else if (
        incident.type === 'breakdown' ||
        incident.type === 'no_show' ||
        incident.type === 'full'
      ) {
        cancelTransport.run(incident.transport_option_id);
      }
    } else {
      // Only restore if no other confirmed incident still disrupts this vehicle.
      restoreTransport.run(incident.transport_option_id, incident.transport_option_id, id);
    }
  })();

  broadcast({
    type: 'incident_updated',
    incidentId: id,
    status,
    transportOptionId: incident.transport_option_id,
  });

  return c.json({ success: true, id, status });
});
