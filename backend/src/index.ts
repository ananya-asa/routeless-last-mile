// ============================================================
// index.ts — Hono app entry point.
// Mounts all route handlers, starts the server.
// ============================================================

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { seedIfEmpty } from './db/seed.js';

// ── Import route handlers ──────────────────────────────────
import { incidentRoutes }  from './routes/incidents.js';
import { requestRoutes }   from './routes/requests.js';
import { recoveryRoutes }  from './routes/recovery.js';
import { eventRoutes }     from './routes/events.js';
import { villageRoutes }   from './routes/villages.js';
import { transportRoutes } from './routes/transport.js';
import { metricRoutes }    from './routes/metrics.js';
import { scenarioRoutes }  from './routes/scenarios.js';
import { triageRoutes }    from './routes/triage.js';

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
app.route('/api/triage',     triageRoutes);

// ── 404 fallback ─────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ── Start server ─────────────────────────────────────────────
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[Server] ROUTELESS backend running on http://localhost:${PORT}`);
  console.log(`[Server] Sarvam AI Kannada triage active at /api/triage/sarvam`);
});

export default app;
