// ============================================================
// metrics.ts — GET /api/metrics
// Derived from canonical rows; never stored by hand.
// ============================================================

import { Hono } from 'hono';
import { computeMetrics } from '../domain/metrics.js';
import { planRecovery } from '../domain/recoveryEngine.js';
import { loadEngineInput } from './recoveryData.js';

export const metricRoutes = new Hono();

metricRoutes.get('/', (c) => {
  const input = loadEngineInput();
  const metrics = computeMetrics(input);
  const plan = planRecovery(input);

  return c.json({
    affected: metrics.affectedRequests,
    examStudents: plan.examStudentCount,
    eligibleProposals: plan.proposedCount,
    confirmedPlacements: metrics.confirmedPlacements,
    unserved: metrics.unserved,
    seatUsage: metrics.seatUsage,
    freeSeats: metrics.freeSeats,
    verifiedVehicles: input.vehicles.filter((vehicle) => vehicle.verified).length,
    unverifiedVehicles: input.vehicles.filter((vehicle) => !vehicle.verified).length,
  });
});
