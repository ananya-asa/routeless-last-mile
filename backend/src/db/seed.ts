// ============================================================
// seed.ts — Demo fixture data for ROUTELESS.
// All data is SIMULATED. Run once on startup if DB is empty.
// Demo scenario clock: 08:00. Class starts: 09:00 (540 min).
// ============================================================

import { db } from './client.js';

const toMin = (h: number, m: number) => h * 60 + m;

export const DEMO_CLASS_START_MIN = toMin(9, 0);

export const DEMO_VILLAGES = [
  { id: 'VLG-A', name: 'Village A', corridor_id: 'CRD-NORTH' },
  { id: 'VLG-B', name: 'Village B', corridor_id: 'CRD-NORTH' },
  { id: 'VLG-C', name: 'Village C', corridor_id: 'CRD-SOUTH' },
] as const;

interface BaselineTransport {
  id: string;
  label: string;
  kind: 'government_bus' | 'institution_vehicle';
  status: 'active' | 'delayed' | 'cancelled';
  verified: number;
  capacity: number;
  occupied: number;
  dep: number;
  arr: number;
  accessible: number;
  driver: string;
  contact: string;
  villages: string[];
}

/** The canonical fixture state every scenario resets to before applying its twist. */
export const BASELINE_TRANSPORTS: BaselineTransport[] = [
  {
    id: 'BUS-B1',
    label: 'Bus B1 — Village A & B Express',
    kind: 'government_bus',
    status: 'active',
    verified: 1,
    capacity: 40,
    occupied: 15,
    dep: toMin(7, 0),
    arr: toMin(8, 45),
    accessible: 0,
    driver: 'Ramesh Kumar',
    contact: '98100-11111',
    villages: ['VLG-A', 'VLG-B'],
  },
  {
    id: 'BUS-B2',
    label: 'Bus B2 — Village C Direct',
    kind: 'government_bus',
    status: 'active',
    verified: 1,
    capacity: 40,
    occupied: 0,
    dep: toMin(7, 30),
    arr: toMin(8, 50),
    accessible: 0,
    driver: 'Sunil Singh',
    contact: '98100-22222',
    villages: ['VLG-C'],
  },
  {
    id: 'VAN-V1',
    label: 'Van V1 — School Backup (Village C)',
    kind: 'institution_vehicle',
    status: 'active',
    verified: 1,
    capacity: 10,
    occupied: 2,
    dep: toMin(7, 45),
    arr: toMin(8, 55),
    accessible: 1,
    driver: 'Arvind Mehra',
    contact: '98100-33333',
    villages: ['VLG-C'],
  },
];

/** 12 pseudonymous Village C students. No personal data. */
export const DEMO_STUDENTS = Array.from({ length: 12 }, (_, index) => {
  const n = index + 1;
  return {
    id: `STU-${String(n).padStart(3, '0')}`,
    village_id: 'VLG-C',
    institution_id: 'demo-district',
    class_start_min: DEMO_CLASS_START_MIN,
    // A deterministic mix exercises exam priority and accessibility rules.
    is_exam_day: n === 2 || n === 7 ? 1 : 0,
    previous_unserved_days: n === 3 ? 2 : 0,
    needs_accessible_vehicle: n === 4 || n === 11 ? 1 : 0,
  };
});

export const DEMO_SCENARIOS = [
  {
    id: 'SCN-BREAKDOWN',
    name: 'Bus Breakdown',
    description: 'Bus B2 is reported broken down. Van V1 has 8 verified seats for 12 Village C students.',
  },
  {
    id: 'SCN-OVERCROWDING',
    name: 'Overcrowding',
    description: 'Bus B1 is full. Villages A and B have no spare capacity; the board must stay honest.',
  },
  {
    id: 'SCN-ROADBLOCK',
    name: 'Road Blocked',
    description: 'The southern corridor is blocked. No verified vehicle can reach Village C.',
  },
  {
    id: 'SCN-NOBACKUP',
    name: 'Zero Backup',
    description: 'Bus B2 breaks down and Van V1 is unavailable. 12 affected, 0 seats, honest escalation.',
  },
] as const;

function insertVillages() {
  const insertVillage = db.prepare(
    'INSERT OR IGNORE INTO villages (id, name, corridor_id) VALUES (?, ?, ?)',
  );
  for (const village of DEMO_VILLAGES) {
    insertVillage.run(village.id, village.name, village.corridor_id);
  }
}

function insertStudents() {
  const insertStudent = db.prepare(`
    INSERT OR IGNORE INTO students
      (id, village_id, institution_id, class_start_min, is_exam_day,
       previous_unserved_days, needs_accessible_vehicle)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const student of DEMO_STUDENTS) {
    insertStudent.run(
      student.id,
      student.village_id,
      student.institution_id,
      student.class_start_min,
      student.is_exam_day,
      student.previous_unserved_days,
      student.needs_accessible_vehicle,
    );
  }
}

function insertScenarios() {
  const insertScenario = db.prepare(
    'INSERT OR IGNORE INTO scenarios (id, name, description) VALUES (?, ?, ?)',
  );
  for (const scenario of DEMO_SCENARIOS) {
    insertScenario.run(scenario.id, scenario.name, scenario.description);
  }
}

function insertBaselineTransports() {
  const insertTransport = db.prepare(`
    INSERT OR IGNORE INTO transport_options
      (id, label, kind, status, verified, capacity, occupied_seats,
       departure_min, arrival_min, accessible, driver_name, contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTransportVillage = db.prepare(
    'INSERT OR IGNORE INTO transport_villages (transport_id, village_id) VALUES (?, ?)',
  );

  for (const transport of BASELINE_TRANSPORTS) {
    insertTransport.run(
      transport.id,
      transport.label,
      transport.kind,
      transport.status,
      transport.verified,
      transport.capacity,
      transport.occupied,
      transport.dep,
      transport.arr,
      transport.accessible,
      transport.driver,
      transport.contact,
    );
    for (const villageId of transport.villages) {
      insertTransportVillage.run(transport.id, villageId);
    }
  }
}

/**
 * Ensure lookup/static data is present, even if an older database already had
 * villages but not the newer students or scenario rows.
 */
export function seedStaticData() {
  insertVillages();
  insertStudents();
  insertBaselineTransports();
  insertScenarios();
}

export function seedIfEmpty() {
  const villageCount = (
    db.prepare('SELECT COUNT(*) as c FROM villages').get() as { c: number }
  ).c;

  if (villageCount > 0) {
    // Idempotent repair for databases created by an earlier scaffold.
    seedStaticData();
    console.log('[Seed] Data already exists — static fixtures checked.');
    return;
  }

  console.log('[Seed] Seeding demo data...');

  const run = db.transaction(() => {
    insertVillages();
    insertBaselineTransports();
    insertScenarios();
    insertStudents();

    // ── Demo incident (B2 breakdown — initially reported/unverified) ──
    const incidentId = 'INC-B2-BREAKDOWN';
    db.prepare(`
      INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      incidentId,
      'BUS-B2',
      'breakdown',
      'reported',
      'student',
      'Bus B2 has not arrived at the stop. Demo scenario.',
    );
    db.prepare(
      'INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)',
    ).run(incidentId, 'VLG-C');

    // ── 12 pseudonymous help requests (Village C students) ───
    const insertRequest = db.prepare(`
      INSERT INTO help_requests (id, student_id, incident_id, status)
      VALUES (?, ?, ?, 'pending')
    `);
    for (let i = 1; i <= 12; i++) {
      const studentId = `STU-${String(i).padStart(3, '0')}`;
      const requestId = `REQ-${String(i).padStart(3, '0')}`;
      insertRequest.run(requestId, studentId, incidentId);
    }
  });

  run();
  console.log('[Seed] Demo data seeded successfully.');
  console.log('[Seed] Scenario: B2 breakdown reported; 12 Village C requests pending.');
}
