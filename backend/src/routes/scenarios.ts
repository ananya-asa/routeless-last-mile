// scenarios.ts — GET and POST for resetting demo presets, including THE EXAM DAY CRISIS
import { Hono } from 'hono';
import { db } from '../db/client.js';
import { broadcast } from './events.js';

export const scenarioRoutes = new Hono();

scenarioRoutes.get('/', (c) => {
  const list = db.prepare('SELECT * FROM scenarios').all();
  return c.json({ data: list });
});

scenarioRoutes.post('/reset/:id', (c) => {
  const scenarioId = c.req.param('id');
  
  // Clear dynamic transactional state
  db.prepare('DELETE FROM assignments').run();
  db.prepare('DELETE FROM help_requests').run();
  db.prepare('DELETE FROM incident_villages').run();
  db.prepare('DELETE FROM incidents').run();
  db.prepare('DELETE FROM transport_blocked_corridors').run();

  // Config-driven relay: Village C -> Village B junction, then verified BUS-B1.
  // INSERT OR IGNORE keeps this idempotent across resets and older demo DBs.
  db.prepare(`
    INSERT OR IGNORE INTO relay_routes
      (id, source_village_id, junction_village_id, connecting_transport_id,
       walk_distance_km, corridor_id)
    VALUES ('RLY-C-B', 'VLG-C', 'VLG-B', 'BUS-B1', 1.5, 'CRD-SOUTH')
  `).run();

  if (scenarioId === 'SCN-BREAKDOWN') {
    // Reset to default standard demo fixture (B2 broken, V1 has 8 seats)
    db.prepare(`UPDATE transport_options SET status = 'active', occupied_seats = 0 WHERE id = 'BUS-B1'`).run();
    db.prepare(`UPDATE transport_options SET status = 'active', occupied_seats = 0 WHERE id = 'BUS-B2'`).run();
    db.prepare(`UPDATE transport_options SET status = 'active', occupied_seats = 2 WHERE id = 'VAN-V1'`).run();

    const incId = 'INC-B2-BREAKDOWN';
    db.prepare(`
      INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
      VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator', 'B2 engine failure confirmed near Village C')
    `).run(incId);
    db.prepare('INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)').run(incId, 'VLG-C');

    const insertReq = db.prepare(`INSERT INTO help_requests (id, student_id, incident_id, status, is_exam_day) VALUES (?, ?, ?, 'pending', 0)`);
    for (let i = 1; i <= 12; i++) {
      insertReq.run(`REQ-${String(i).padStart(3, '0')}`, `STU-${String(i).padStart(3, '0')}`, incId);
    }
  } else if (scenarioId === 'SCN-EXAM-CRISIS') {
    // ══════════════════════════════════════════════════════════════════
    // SURPRISE HURDLE: THE EXAM DAY CRISIS
    // 1. Two buses breakdown: Bus B1 AND Bus B2 are unavailable!
    // 2. Road blockage: Southern corridor to Village C flooded.
    // 3. Demand surge (+40%): 17 students total.
    // 4. Time pressure: 10 students have board examinations at 09:00 AM!
    // ══════════════════════════════════════════════════════════════════
    db.prepare(`UPDATE transport_options SET status = 'cancelled' WHERE id = 'BUS-B1'`).run();
    db.prepare(`UPDATE transport_options SET status = 'cancelled' WHERE id = 'BUS-B2'`).run();
    db.prepare(`UPDATE transport_options SET status = 'active', occupied_seats = 2 WHERE id = 'VAN-V1'`).run();

    // Mark Southern Corridor as blocked by flood
    db.prepare(`INSERT OR IGNORE INTO transport_blocked_corridors (transport_id, corridor_id) VALUES ('VAN-V1', 'CRD-SOUTH')`).run();

    const incId = 'INC-EXAM-CRISIS';
    db.prepare(`
      INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
      VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator', 'EXAM DAY CRISIS: Dual bus breakdown + Southern corridor road flood!')
    `).run(incId);
    db.prepare('INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)').run(incId, 'VLG-C');

    const insertReq = db.prepare(`INSERT INTO help_requests (id, student_id, incident_id, status, is_exam_day) VALUES (?, ?, ?, 'pending', ?)`);
    
    // 17 students (40% surge over 12): First 10 are exam students!
    for (let i = 1; i <= 17; i++) {
      const isExam = i <= 10 ? 1 : 0;
      insertReq.run(`REQ-${String(i).padStart(3, '0')}`, `STU-${String(i).padStart(3, '0')}`, incId, isExam);
    }
  } else if (scenarioId === 'SCN-NOBACKUP') {
    db.prepare(`UPDATE transport_options SET status = 'cancelled', occupied_seats = 10 WHERE id = 'VAN-V1'`).run();

    const incId = 'INC-NOBACKUP';
    db.prepare(`
      INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
      VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator', 'B2 broken down; Van V1 unavailable')
    `).run(incId);
    db.prepare('INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)').run(incId, 'VLG-C');

    const insertReq = db.prepare(`INSERT INTO help_requests (id, student_id, incident_id, status, is_exam_day) VALUES (?, ?, ?, 'pending', 0)`);
    for (let i = 1; i <= 12; i++) {
      insertReq.run(`REQ-${String(i).padStart(3, '0')}`, `STU-${String(i).padStart(3, '0')}`, incId);
    }
  }

  broadcast({ type: 'scenario_reset', scenarioId });
  return c.json({ success: true, scenarioId });
});
