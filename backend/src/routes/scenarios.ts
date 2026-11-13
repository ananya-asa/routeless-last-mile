// scenarios.ts — GET and POST for resetting demo presets
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

  if (scenarioId === 'SCN-BREAKDOWN') {
    // Reset to default standard demo fixture (B2 broken, V1 has 8 seats)
    db.prepare(`UPDATE transport_options SET status = 'active', occupied_seats = 0 WHERE id = 'BUS-B2'`).run();
    db.prepare(`UPDATE transport_options SET status = 'active', occupied_seats = 2 WHERE id = 'VAN-V1'`).run();

    const incId = 'INC-B2-BREAKDOWN';
    db.prepare(`
      INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
      VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator', 'B2 engine failure confirmed near Village C')
    `).run(incId);
    db.prepare('INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)').run(incId, 'VLG-C');

    const insertReq = db.prepare(`INSERT INTO help_requests (id, student_id, incident_id, status) VALUES (?, ?, ?, 'pending')`);
    for (let i = 1; i <= 12; i++) {
      insertReq.run(`REQ-${String(i).padStart(3, '0')}`, `STU-${String(i).padStart(3, '0')}`, incId);
    }
  } else if (scenarioId === 'SCN-NOBACKUP') {
    // B2 broken, V1 cancelled / zero backup
    db.prepare(`UPDATE transport_options SET status = 'cancelled', occupied_seats = 10 WHERE id = 'VAN-V1'`).run();

    const incId = 'INC-NOBACKUP';
    db.prepare(`
      INSERT INTO incidents (id, transport_option_id, type, status, reported_by, details)
      VALUES (?, 'BUS-B2', 'breakdown', 'confirmed', 'coordinator', 'B2 broken down; Van V1 unavailable')
    `).run(incId);
    db.prepare('INSERT INTO incident_villages (incident_id, village_id) VALUES (?, ?)').run(incId, 'VLG-C');

    const insertReq = db.prepare(`INSERT INTO help_requests (id, student_id, incident_id, status) VALUES (?, ?, ?, 'pending')`);
    for (let i = 1; i <= 12; i++) {
      insertReq.run(`REQ-${String(i).padStart(3, '0')}`, `STU-${String(i).padStart(3, '0')}`, incId);
    }
  }

  broadcast({ type: 'scenario_reset', scenarioId });
  return c.json({ success: true, scenarioId });
});

