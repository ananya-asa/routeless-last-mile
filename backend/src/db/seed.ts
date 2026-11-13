// ============================================================
// seed.ts — Demo fixture data for ROUTELESS.
// All data is SIMULATED. Run once on startup if DB is empty.
// Demo scenario clock: 08:00. Class starts: 09:00 (540 min).
// ============================================================

import { db } from './client.js';
import { v4 as uuid } from 'uuid';

// Helper: minutes from midnight
const toMin = (h: number, m: number) => h * 60 + m;

export function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM villages').get() as { c: number }).c;
  if (count > 0) {
    console.log('[Seed] Data already exists — skipping seed.');
    return;
  }

  console.log('[Seed] Seeding demo data...');

  const run = db.transaction(() => {

    // ── Villages ─────────────────────────────────────────────
    const villages = [
      { id: 'VLG-A', name: 'Village A', corridor_id: 'CRD-NORTH' },
      { id: 'VLG-B', name: 'Village B', corridor_id: 'CRD-NORTH' },
      { id: 'VLG-C', name: 'Village C', corridor_id: 'CRD-SOUTH' },
    ];
    const insertVillage = db.prepare(
      'INSERT INTO villages (id, name, corridor_id) VALUES (?, ?, ?)'
    );
    for (const v of villages) insertVillage.run(v.id, v.name, v.corridor_id);

    // ── Transport Options ─────────────────────────────────────
    const insertTransport = db.prepare(`
      INSERT INTO transport_options
        (id, label, kind, status, verified, capacity, occupied_seats,
         departure_min, arrival_min, accessible, driver_name, contact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transports = [
      {
        id: 'BUS-B1', label: 'Bus B1 — Village A & B Express',
        kind: 'government_bus', status: 'active', verified: 1,
        capacity: 40, occupied: 15,
        dep: toMin(7, 0), arr: toMin(8, 45),
        accessible: 0, driver: 'Ramesh Kumar', contact: '98100-11111',
        villages: ['VLG-A', 'VLG-B'], blocked: [],
      },
      {
        id: 'BUS-B2', label: 'Bus B2 — Village C Direct',
        kind: 'government_bus', status: 'active', verified: 1,
        capacity: 40, occupied: 0,
        dep: toMin(7, 30), arr: toMin(8, 50),
        accessible: 0, driver: 'Sunil Singh', contact: '98100-22222',
        villages: ['VLG-C'], blocked: [],
      },
      {
        id: 'VAN-V1', label: 'Van V1 — School Backup (Village C)',
        kind: 'institution_vehicle', status: 'active', verified: 1,
        capacity: 10, occupied: 2,
        dep: toMin(7, 45), arr: toMin(8, 55),
        accessible: 1, driver: 'Arvind Mehra', contact: '98100-33333',
        villages: ['VLG-C'], blocked: [],
      },
    ];

    const insertTV = db.prepare(
      'INSERT INTO transport_villages (transport_id, village_id) VALUES (?, ?)'
    );

    for (const t of transports) {
      insertTransport.run(
        t.id, t.label, t.kind, t.status, t.verified,
        t.capacity, t.occupied, t.dep, t.arr,
        t.accessible, t.driver, t.contact
      );
      for (const vid of t.villages) insertTV.run(t.id, vid);
    }

    // ── Config-driven relay for a blocked Southern corridor ──
    // Village C students can walk the dry path to Village B and board BUS-B1.
    db.prepare(`
      INSERT OR IGNORE INTO relay_routes
        (id, source_village_id, junction_village_id, connecting_transport_id,
         walk_distance_km, corridor_id)
      VALUES ('RLY-C-B', 'VLG-C', 'VLG-B', 'BUS-B1', 1.5, 'CRD-SOUTH')
    `).run();

    // ── Scenarios ─────────────────────────────────────────────
    const insertScenario = db.prepare(
      'INSERT INTO scenarios (id, name, description) VALUES (?, ?, ?)'
    );
    insertScenario.run('SCN-BREAKDOWN',    'Bus Breakdown',   'Bus B2 breaks down; Van V1 available with 8 seats');
    insertScenario.run('SCN-OVERCROWDING', 'Overcrowding',    'Bus B1 is full; students from Villages A & B need help');
    insertScenario.run('SCN-ROADBLOCK',    'Road Blocked',    'Southern corridor blocked; no vehicle can reach Village C');
    insertScenario.run('SCN-NOBACKUP',     'Zero Backup',     'Bus B2 breaks down; no verified backup available');

    // ── Demo incident (B2 breakdown — initially reported/unverified) ──
    const incidentId = 'INC-B2-BREAKDOWN';
    db.prepare(`
      INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      incidentId, 'BUS-B2', 'breakdown', 'reported', 'student',
      'Bus B2 has not arrived at the stop. Demo scenario.'
    );
    db.prepare(
      'INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)'
    ).run(incidentId, 'VLG-C');

    // ── 12 pseudonymous help requests (Village C students) ───
    const insertRequest = db.prepare(`
      INSERT INTO help_requests (id, student_id, incident_id, status)
      VALUES (?, ?, ?, 'pending')
    `);
    for (let i = 1; i <= 12; i++) {
      const sid = `STU-${String(i).padStart(3, '0')}`;
      const rid = `REQ-${String(i).padStart(3, '0')}`;
      insertRequest.run(rid, sid, incidentId);
    }

    // ── A few other demo students for context (Villages A & B) ──
    const otherStudents = [
      { sid: 'STU-013', rid: 'REQ-013' },
      { sid: 'STU-014', rid: 'REQ-014' },
      { sid: 'STU-015', rid: 'REQ-015' },
    ];
    // These don't have an active incident — just for dashboard context

  });

  run();
  console.log('[Seed] Demo data seeded successfully.');
  console.log('[Seed] Scenario: B2 breakdown reported; 12 Village C requests pending.');
}

