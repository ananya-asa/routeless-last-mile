// ============================================================
// index.ts — Hono app entry point.
// Mounts all route handlers, starts the server.
// Person 2 fills in the route files; this file just wires them.
// ============================================================

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { db } from './db/client.js';
import { seedIfEmpty } from './db/seed.js';

// ── Import route handlers (Person 2 fills these in) ─────────
import { incidentRoutes }  from './routes/incidents.js';
import { requestRoutes }   from './routes/requests.js';
import { recoveryRoutes }  from './routes/recovery.js';
import { eventRoutes }     from './routes/events.js';
import { villageRoutes }   from './routes/villages.js';
import { transportRoutes } from './routes/transport.js';
import { metricRoutes }    from './routes/metrics.js';
import { scenarioRoutes }  from './routes/scenarios.js';

const PORT = Number(process.env.PORT ?? 3000);

// ── Seed DB on startup ───────────────────────────────────────
seedIfEmpty();

// ── Hono App ─────────────────────────────────────────────────
const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type'],
}));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'OK', demo: true, time: new Date().toISOString() }));

// ── API routes ───────────────────────────────────────────────
app.route('/api/villages',   villageRoutes);
app.route('/api/transport',  transportRoutes);
app.route('/api/incidents',  incidentRoutes);
app.route('/api/requests',   requestRoutes);
app.route('/api/recovery',   recoveryRoutes);
app.route('/api/events',     eventRoutes);
app.route('/api/metrics',    metricRoutes);
app.route('/api/scenarios',  scenarioRoutes);

// ── 404 fallback ─────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ── Start server ─────────────────────────────────────────────
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[Server] ROUTELESS backend running on http://localhost:${PORT}`);
  console.log(`[Server] Demo scenario loaded — 12 Village C students pending`);
});

export default app;

