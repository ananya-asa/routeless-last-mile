// ============================================================
// transport.ts — GET /api/transport, PATCH /api/transport/:id
// Returns the camelCase contract used by the frontend.
// ============================================================

import { Hono } from 'hono';
import { db } from '../db/client.js';
import { broadcast } from './events.js';

export const transportRoutes = new Hono();

const VEHICLE_STATUSES = new Set(['active', 'delayed', 'cancelled']);

interface TransportRow {
  id: string;
  label: string;
  kind: string;
  status: string;
  verified: number;
  capacity: number;
  occupied_seats: number;
  departure_min: number;
  arrival_min: number;
  accessible: number;
}

interface TransportVillageRow {
  transport_id: string;
  village_id: string;
}

interface BlockedCorridorRow {
  transport_id: string;
  corridor_id: string;
}

function loadTransportRows(): TransportRow[] {
  return db
    .prepare(
      `SELECT id, label, kind, status, verified, capacity, occupied_seats,
              departure_min, arrival_min, accessible
       FROM transport_options
       ORDER BY id`,
    )
    .all() as TransportRow[];
}

function loadRoutes(): Map<string, string[]> {
  const rows = db
    .prepare('SELECT transport_id, village_id FROM transport_villages ORDER BY village_id')
    .all() as TransportVillageRow[];
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.transport_id) ?? [];
    list.push(row.village_id);
    map.set(row.transport_id, list);
  }
  return map;
}

function loadBlockedCorridors(): Map<string, string[]> {
  const rows = db
    .prepare('SELECT transport_id, corridor_id FROM transport_blocked_corridors ORDER BY corridor_id')
    .all() as BlockedCorridorRow[];
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.transport_id) ?? [];
    list.push(row.corridor_id);
    map.set(row.transport_id, list);
  }
  return map;
}

function toTransport(
  row: TransportRow,
  villageIds: string[],
  blockedCorridorIds: string[],
) {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind === 'institution_vehicle' ? 'school_van' : 'government_bus',
    status: row.status,
    verified: row.verified === 1,
    capacity: row.capacity,
    occupiedSeats: row.occupied_seats,
    departureMin: row.departure_min,
    // The demo schema stores one estimated arrival per vehicle.
    arrivalMinByVillage: Object.fromEntries(
      villageIds.map((villageId) => [villageId, row.arrival_min]),
    ) as Record<string, number>,
    accessible: row.accessible === 1,
    villageIds,
    blockedCorridorIds,
  };
}

// ── GET /api/transport ───────────────────────────────────────
transportRoutes.get('/', (c) => {
  const routes = loadRoutes();
  const blocked = loadBlockedCorridors();

  return c.json({
    data: loadTransportRows().map((row) =>
      toTransport(row, routes.get(row.id) ?? [], blocked.get(row.id) ?? []),
    ),
  });
});

// ── PATCH /api/transport/:id ─────────────────────────────────
// Body: { occupiedSeats?: number, status?: VehicleStatus }
// Also accepts occupied_seats for older clients.
transportRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');

  let body: {
    occupiedSeats?: unknown;
    occupied_seats?: unknown;
    status?: unknown;
  };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const transport = db
    .prepare('SELECT id, capacity, occupied_seats, status FROM transport_options WHERE id = ?')
    .get(id) as
    | { id: string; capacity: number; occupied_seats: number; status: string }
    | undefined;
  if (!transport) {
    return c.json({ error: 'Transport not found.' }, 404);
  }

  const occupiedSeats = body.occupiedSeats ?? body.occupied_seats;
  const status = body.status;

  if (occupiedSeats === undefined && status === undefined) {
    return c.json({ error: 'Provide occupiedSeats and/or status.' }, 400);
  }

  if (occupiedSeats !== undefined) {
    if (
      typeof occupiedSeats !== 'number' ||
      !Number.isInteger(occupiedSeats) ||
      occupiedSeats < 0 ||
      occupiedSeats > transport.capacity
    ) {
      return c.json(
        { error: `occupiedSeats must be an integer between 0 and ${transport.capacity}.` },
        400,
      );
    }
  }

  if (status !== undefined && (typeof status !== 'string' || !VEHICLE_STATUSES.has(status))) {
    return c.json(
      { error: `status must be one of: ${[...VEHICLE_STATUSES].join(', ')}.` },
      400,
    );
  }

  db.transaction(() => {
    if (occupiedSeats !== undefined) {
      db.prepare('UPDATE transport_options SET occupied_seats = ? WHERE id = ?').run(
        occupiedSeats,
        id,
      );
    }
    if (status !== undefined) {
      db.prepare('UPDATE transport_options SET status = ? WHERE id = ?').run(status, id);
    }
  })();

  broadcast({
    type: 'transport_updated',
    transportId: id,
    occupiedSeats: occupiedSeats ?? transport.occupied_seats,
    status: status ?? transport.status,
  });

  return c.json({ success: true, id });
});
