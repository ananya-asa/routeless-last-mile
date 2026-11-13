// scenarios.ts — Deterministic demo presets used by the coordinator.
// Every reset restores the canonical fixture, then applies one disruption.
import { Hono } from 'hono';
import { db } from '../db/client.js';
import { broadcast } from './events.js';

export const scenarioRoutes = new Hono();

const SCENARIO_IDS = new Set([
  'SCN-DEFAULT',
  'SCN-BREAKDOWN',
  'SCN-OVERCROWDING',
  'SCN-ROADBLOCK',
  'SCN-NOBACKUP',
  'SCN-EXAM-CRISIS',
]);

function clearDynamicState() {
  db.prepare('DELETE FROM assignments').run();
  db.prepare('DELETE FROM help_requests').run();
  db.prepare('DELETE FROM incident_villages').run();
  db.prepare('DELETE FROM incidents').run();
  db.prepare('DELETE FROM transport_blocked_corridors').run();
}

function resetVehiclesToBaseline() {
  db.prepare(
    `UPDATE transport_options SET status = 'active', occupied_seats = 15, verified = 1
     WHERE id = 'BUS-B1'`,
  ).run();
  db.prepare(
    `UPDATE transport_options SET status = 'active', occupied_seats = 0, verified = 1
     WHERE id = 'BUS-B2'`,
  ).run();
  db.prepare(
    `UPDATE transport_options SET status = 'active', occupied_seats = 2, verified = 1
     WHERE id = 'VAN-V1'`,
  ).run();
}

function insertIncident(
  id: string,
  transportId: string,
  type: string,
  status: 'reported' | 'confirmed',
  villageIds: string[],
  details: string,
) {
  db.prepare(`
    INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
    VALUES (?, ?, ?, ?, 'coordinator', ?)
  `).run(id, transportId, type, status, details);
  for (const villageId of villageIds) {
    db.prepare(
      'INSERT OR IGNORE INTO incident_villages (incident_id, village_id) VALUES (?, ?)',
    ).run(id, villageId);
  }
}

function insertRequests(
  rows: Array<{ id: string; studentId: string; incidentId: string; isExamDay?: number }>,
) {
  const insert = db.prepare(`
    INSERT INTO help_requests (id, student_id, incident_id, status, is_exam_day)
    VALUES (?, ?, ?, 'pending', ?)
  `);
  for (const row of rows) {
    insert.run(row.id, row.studentId, row.incidentId, row.isExamDay ?? 0);
  }
}

function villageCRequests(incidentId: string, count = 12) {
  return Array.from({ length: count }, (_, index) => ({
    id: `REQ-${String(index + 1).padStart(3, '0')}`,
    studentId: `STU-${String(index + 1).padStart(3, '0')}`,
    incidentId,
    isExamDay: 0,
  }));
}

scenarioRoutes.get('/', (c) => {
  const list = db.prepare('SELECT * FROM scenarios ORDER BY id').all();
  return c.json({ data: list });
});

scenarioRoutes.post('/reset/:id', (c) => {
  const scenarioId = c.req.param('id');
  if (!SCENARIO_IDS.has(scenarioId)) {
    return c.json({ error: `Unknown scenario: ${scenarioId}` }, 404);
  }

  clearDynamicState();
  resetVehiclesToBaseline();

  // Config-driven relay for the blocked Southern corridor.
  db.prepare(`
    INSERT OR IGNORE INTO relay_routes
      (id, source_village_id, junction_village_id, connecting_transport_id,
       walk_distance_km, corridor_id)
    VALUES ('RLY-C-B', 'VLG-C', 'VLG-B', 'BUS-B1', 1.5, 'CRD-SOUTH')
  `).run();

  if (scenarioId === 'SCN-DEFAULT' || scenarioId === 'SCN-BREAKDOWN') {
    // B2 is reported (unverified); coordinator confirms it in the live demo.
    insertIncident(
      'INC-B2-BREAKDOWN',
      'BUS-B2',
      'breakdown',
      'reported',
      ['VLG-C'],
      'Bus B2 has not arrived at the stop. Student reports await coordinator confirmation.',
    );
    insertRequests(villageCRequests('INC-B2-BREAKDOWN'));
  }

  if (scenarioId === 'SCN-OVERCROWDING') {
    db.prepare("UPDATE transport_options SET occupied_seats = 40, status = 'delayed' WHERE id = 'BUS-B1'").run();
    insertIncident(
      'INC-B1-FULL',
      'BUS-B1',
      'full',
      'confirmed',
      ['VLG-A', 'VLG-B'],
      'Bus B1 arrived full. Villages A and B are stranded with no spare verified capacity.',
    );
    const requests = Array.from({ length: 12 }, (_, index) => {
      const village = index % 2 === 0 ? 'A' : 'B';
      const n = Math.floor(index / 2) + 1;
      return {
        id: `REQ-${village}0${n}`,
        studentId: `STU-${village}0${n}`,
        incidentId: 'INC-B1-FULL',
        isExamDay: 0,
      };
    });
    insertRequests(requests);
  }

  if (scenarioId === 'SCN-ROADBLOCK') {
    db.prepare(
      "INSERT OR IGNORE INTO transport_blocked_corridors (transport_id, corridor_id) VALUES ('VAN-V1', 'CRD-SOUTH')",
    ).run();
    insertIncident(
      'INC-C-ROADBLOCK',
      'BUS-B2',
      'road_block',
      'confirmed',
      ['VLG-C'],
      'The southern corridor is blocked. No verified vehicle can reach Village C.',
    );
    insertRequests(villageCRequests('INC-C-ROADBLOCK'));
  }

  if (scenarioId === 'SCN-NOBACKUP') {
    db.prepare("UPDATE transport_options SET status = 'cancelled', occupied_seats = 10 WHERE id = 'VAN-V1'").run();
    insertIncident(
      'INC-NOBACKUP',
      'BUS-B2',
      'breakdown',
      'confirmed',
      ['VLG-C'],
      'Bus B2 has broken down and Van V1 is unavailable. Zero verified backup seats.',
    );
    insertRequests(villageCRequests('INC-NOBACKUP'));
  }

  if (scenarioId === 'SCN-EXAM-CRISIS') {
    db.prepare("UPDATE transport_options SET status = 'cancelled' WHERE id IN ('BUS-B1','BUS-B2')").run();
    insertIncident(
      'INC-EXAM-CRISIS',
      'BUS-B2',
      'breakdown',
      'confirmed',
      ['VLG-C'],
      'EXAM DAY CRISIS: dual bus breakdown plus a flooded southern corridor.',
    );
    insertRequests(villageCRequests('INC-EXAM-CRISIS', 17).map((row, index) => ({
      ...row,
      isExamDay: index < 10 ? 1 : 0,
    })));
  }

  broadcast({ type: 'scenario_reset', scenarioId });
  return c.json({ success: true, scenarioId });
});
