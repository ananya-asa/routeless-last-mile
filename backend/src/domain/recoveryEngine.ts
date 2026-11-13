// recoveryEngine.ts — Deterministic allocation heuristic with Exam Day Crisis prioritization & Relay Routes
import { db } from '../db/client.js';
import { isTransportEligible } from './eligibility.js';

export interface RecoveryProposal {
  requestId: string;
  studentId: string;
  isExamDay: boolean;
  transportOptionId: string;
  transportLabel: string;
  explanation: string;
  relayRoute?: string;
}

export interface UnservedStudent {
  requestId: string;
  studentId: string;
  isExamDay: boolean;
  reason: string;
  explanation: string;
  relayAlternative?: string;
}

export function runRecoveryEngine() {
  const CLASS_START_MIN = 540; // 09:00 AM

  // 1. Get all pending requests tied to CONFIRMED incidents
  // Prioritize students with is_exam_day = 1 FIRST!
  const pendingRequests = db.prepare(`
    SELECT 
      r.id as requestId, 
      r.student_id as studentId, 
      iv.village_id as villageId,
      v.corridor_id as corridorId,
      COALESCE(r.is_exam_day, 0) as isExamDay
    FROM help_requests r
    JOIN incidents i ON r.incident_id = i.id
    LEFT JOIN incident_villages iv ON i.id = iv.incident_id
    LEFT JOIN villages v ON iv.village_id = v.id
    WHERE i.status = 'confirmed' AND r.status = 'pending'
    ORDER BY isExamDay DESC, r.student_id ASC
  `).all() as { requestId: string; studentId: string; villageId: string; corridorId: string; isExamDay: number }[];

  // 2. Fetch all transport options & blocked corridors
  const transportRows = db.prepare('SELECT * FROM transport_options').all() as any[];
  const tvRows = db.prepare('SELECT * FROM transport_villages').all() as { transport_id: string; village_id: string }[];
  const bcRows = db.prepare('SELECT * FROM transport_blocked_corridors').all() as { transport_id: string; corridor_id: string }[];

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
    blockedCorridors: bcRows.filter((b) => b.transport_id === t.id).map((b) => b.corridor_id),
  }));

  // Track existing confirmed assignments
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

  // 3. Deterministic greedy allocation with Exam Day priority
  for (const req of pendingRequests) {
    let assigned = false;
    let failureReason = 'no_capacity';
    const isExam = req.isExamDay === 1;

    for (const transport of transportOptions) {
      const currentAlloc = allocatedSeatsMap[transport.id] ?? 0;
      const check = isTransportEligible({
        studentVillageId: req.villageId || 'VLG-C',
        classStartMin: CLASS_START_MIN,
        isExamDay: isExam,
        transport,
        corridorId: req.corridorId,
        existingConfirmedAllocations: currentAlloc,
      });

      if (check.eligible) {
        proposals.push({
          requestId: req.requestId,
          studentId: req.studentId,
          isExamDay: isExam,
          transportOptionId: transport.id,
          transportLabel: transport.label,
          explanation: isExam 
            ? `[EXAM PRIORITY] Allocated seat on verified ${transport.label}. Strict arrival before 09:00 AM.`
            : `Assigned to verified ${transport.label}. Estimated arrival before 09:00 AM.`,
        });
        allocatedSeatsMap[transport.id] = currentAlloc + 1;
        assigned = true;
        break;
      } else if (check.reason === 'route_blocked') {
        failureReason = 'route_blocked';
      }
    }

    if (!assigned) {
      if (failureReason === 'route_blocked') {
        unserved.push({
          requestId: req.requestId,
          studentId: req.studentId,
          isExamDay: isExam,
          reason: 'route_blocked',
          explanation: `[ROUTE BLOCKED BY FLOOD] Southern corridor flooded. Direct transit unsafe.`,
          relayAlternative: `Relay Route: Travel via Village B (Northern Junction) to connect with high-ground emergency shuttle.`,
        });
      } else {
        unserved.push({
          requestId: req.requestId,
          studentId: req.studentId,
          isExamDay: isExam,
          reason: 'no_capacity',
          explanation: isExam
            ? `[CRITICAL EXAM ALERT] All verified seats exhausted before 09:00 AM deadline. Escalate to Institution Exam Transport Escort.`
            : `Capacity or schedule constraints prevented automated rescue.`,
        });
      }
    }
  }

  return {
    affectedCount: pendingRequests.length,
    proposedCount: proposals.length,
    unservedCount: unserved.length,
    examStudentCount: pendingRequests.filter(r => r.isExamDay === 1).length,
    proposals,
    unserved,
  };
}
