// recoveryEngine.ts — Deterministic allocation heuristic
import { db } from '../db/client.js';
import { isTransportEligible } from './eligibility.js';

export interface RecoveryProposal {
  requestId: string;
  studentId: string;
  transportOptionId: string;
  transportLabel: string;
  explanation: string;
}

export interface UnservedStudent {
  requestId: string;
  studentId: string;
  reason: string;
  explanation: string;
}

export function runRecoveryEngine() {
  const CLASS_START_MIN = 540; // 09:00 AM

  // 1. Get all pending requests tied to CONFIRMED incidents
  const pendingRequests = db.prepare(`
    SELECT r.id as requestId, r.student_id as studentId, iv.village_id as villageId
    FROM help_requests r
    JOIN incidents i ON r.incident_id = i.id
    LEFT JOIN incident_villages iv ON i.id = iv.incident_id
    WHERE i.status = 'confirmed' AND r.status = 'pending'
    ORDER BY r.student_id ASC
  `).all() as { requestId: string; studentId: string; villageId: string }[];

  // 2. Fetch all transport options
  const transportRows = db.prepare('SELECT * FROM transport_options').all() as any[];
  const tvRows = db.prepare('SELECT * FROM transport_villages').all() as { transport_id: string; village_id: string }[];

  const transportOptions = transportRows.map((t) => ({
    id: t.id,
    label: t.label,
    status: t.status,
    verified: t.verified === 1,
    arrivalMin: t.arrival_min,
    capacity: t.capacity,
    occupiedSeats: t.occupied_seats,
    accessible: t.accessible === 1,
    villageIds: tvRows.filter((v) => v.transport_id === t.id).map((v) => v.village_id),
  }));

  // Track assignments already confirmed in the database
  const confirmedCounts = db.prepare(`
    SELECT transport_option_id, COUNT(*) as c
    FROM assignments
    WHERE status = 'confirmed'
    GROUP BY transport_option_id
  `).all() as { transport_option_id: string; c: number }[];

  const allocatedSeatsMap: Record<string, number> = {};
  for (const row of confirmedCounts) {
    allocatedSeatsMap[row.transport_option_id] = row.c;
  }

  const proposals: RecoveryProposal[] = [];
  const unserved: UnservedStudent[] = [];

  // 3. Deterministic greedy allocation
  for (const req of pendingRequests) {
    let assigned = false;

    for (const transport of transportOptions) {
      const currentAlloc = allocatedSeatsMap[transport.id] ?? 0;
      const check = isTransportEligible({
        studentVillageId: req.villageId || 'VLG-C',
        classStartMin: CLASS_START_MIN,
        transport,
        existingConfirmedAllocations: currentAlloc,
      });

      if (check.eligible) {
        proposals.push({
          requestId: req.requestId,
          studentId: req.studentId,
          transportOptionId: transport.id,
          transportLabel: transport.label,
          explanation: `Assigned to verified ${transport.label}. Estimated arrival before 09:00.`,
        });
        allocatedSeatsMap[transport.id] = currentAlloc + 1;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      unserved.push({
        requestId: req.requestId,
        studentId: req.studentId,
        reason: 'no_capacity',
        explanation: 'All verified transport options serving this village are at capacity or unavailable.',
      });
    }
  }

  return {
    affectedCount: pendingRequests.length,
    proposedCount: proposals.length,
    unservedCount: unserved.length,
    proposals,
    unserved,
  };
}

