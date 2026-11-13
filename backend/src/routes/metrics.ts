// metrics.ts — GET /api/metrics for Coordinator summary dashboard
import { Hono } from 'hono';
import { db } from '../db/client.js';

export const metricRoutes = new Hono();

metricRoutes.get('/', (c) => {
  const confirmedIncidents = (db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE status = 'confirmed'`).get() as any).c;
  const reportedIncidents = (db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE status = 'reported'`).get() as any).c;
  
  const affectedRequests = (db.prepare(`
    SELECT COUNT(DISTINCT r.id) as c 
    FROM help_requests r
    JOIN incidents i ON r.incident_id = i.id
    WHERE i.status = 'confirmed'
  `).get() as any).c;

  const confirmedPlacements = (db.prepare(`
    SELECT COUNT(*) as c FROM assignments WHERE status = 'confirmed'
  `).get() as any).c;

  const unserved = Math.max(0, affectedRequests - confirmedPlacements);

  return c.json({
    confirmedIncidents,
    reportedIncidents,
    affectedRequests,
    confirmedPlacements,
    unserved,
  });
});

