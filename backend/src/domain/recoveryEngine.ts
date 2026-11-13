// ============================================================
// recoveryEngine.ts — Deterministic, constraint-based allocation.
//
// This module is deliberately pure: no database, no network, no clock.
// The route layer loads a snapshot, calls planRecovery/approvePlan, then
// applies the result in one SQLite transaction. That makes every rule here
// directly testable and prevents draft proposals from mutating live capacity.
// ============================================================

import {
  isTransportEligible,
  type EligibilityReason,
  type EligibilityStudent,
  type EligibilityTransport,
} from './eligibility.js';

// ── Snapshot types ───────────────────────────────────────────

export interface RecoveryStudent extends EligibilityStudent {
  id: string;
  isExamDay: boolean;
  previousUnservedDays: number;
}

export interface RecoveryTransport extends EligibilityTransport {
  label: string;
  kind: 'government_bus' | 'institution_vehicle' | string;
  departureMin: number;
}

export interface RecoveryIncident {
  id: string;
  transportOptionId: string;
  type: 'no_show' | 'full' | 'breakdown' | 'delay' | 'road_block' | string;
  status: 'reported' | 'confirmed' | 'dismissed' | string;
  affectedVillageIds: string[];
  /** Optional corridors explicitly blocked by this incident. */
  blockedCorridorIds?: string[];
}

export interface RecoveryRequest {
  id: string;
  studentId: string;
  incidentId: string;
  status:
    | 'pending'
    | 'proposed'
    | 'confirmed'
    | 'unserved'
    | 'escalated'
    | string;
}

export interface RecoveryAssignment {
  requestId: string;
  transportOptionId: string;
  status: 'proposed' | 'confirmed' | 'cancelled' | string;
  explanation?: string;
}

export interface RecoveryInput {
  students: RecoveryStudent[];
  transports: RecoveryTransport[];
  incidents: RecoveryIncident[];
  requests: RecoveryRequest[];
  assignments: RecoveryAssignment[];
  /** Fallback deadline when a student row is missing. */
  classStartMin?: number;
}

export type UnservedReason =
  | 'no_verified_vehicle'
  | 'incompatible_route'
  | 'too_late'
  | 'no_capacity';

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
  reason: UnservedReason;
  explanation: string;
}

export interface RecoveryResult {
  affectedCount: number;
  proposedCount: number;
  unservedCount: number;
  confirmedCount: number;
  pendingCount: number;
  proposals: RecoveryProposal[];
  unserved: UnservedStudent[];
}

// ── Small deterministic helpers ──────────────────────────────

const DEFAULT_CLASS_START_MIN = 9 * 60;

function formatMin(total: number): string {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function stableCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function confirmedIncidentIds(input: RecoveryInput): Set<string> {
  return new Set(
    input.incidents
      .filter((incident) => incident.status === 'confirmed')
      .map((incident) => incident.id),
  );
}

function disruptedTransportIds(input: RecoveryInput): Set<string> {
  return new Set(
    input.incidents
      .filter((incident) => incident.status === 'confirmed')
      .map((incident) => incident.transportOptionId),
  );
}

function blockedCorridors(input: RecoveryInput): Set<string> {
  const blocked = new Set<string>();

  for (const incident of input.incidents) {
    if (incident.status !== 'confirmed') continue;
    for (const corridorId of incident.blockedCorridorIds ?? []) {
      blocked.add(corridorId);
    }
    if (incident.type === 'road_block') {
      const affectedVillages = new Set(incident.affectedVillageIds);
      for (const student of input.students) {
        if (affectedVillages.has(student.villageId)) blocked.add(student.corridorId);
      }
    }
  }

  return blocked;
}

function confirmedSeatCounts(input: RecoveryInput): Map<string, number> {
  const counts = new Map<string, number>();
  for (const assignment of input.assignments) {
    if (assignment.status !== 'confirmed') continue;
    counts.set(
      assignment.transportOptionId,
      (counts.get(assignment.transportOptionId) ?? 0) + 1,
    );
  }
  return counts;
}

/** All unique requests touched by confirmed incidents, including confirmed ones. */
function affectedRequests(input: RecoveryInput): RecoveryRequest[] {
  const incidentIds = confirmedIncidentIds(input);
  const seen = new Set<string>();
  const output: RecoveryRequest[] = [];

  for (const request of input.requests) {
    if (!incidentIds.has(request.incidentId)) continue;
    const key = `${request.studentId}::${request.incidentId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(request);
  }

  return output.sort((a, b) => stableCompare(a.id, b.id));
}

function basicRouteServes(
  student: RecoveryStudent,
  transport: RecoveryTransport,
  disrupted: ReadonlySet<string>,
  blocked: ReadonlySet<string>,
): boolean {
  if (!transport.verified || transport.status !== 'active') return false;
  if (disrupted.has(transport.id)) return false;
  if (!transport.villageIds.includes(student.villageId)) return false;
  if (
    transport.blockedCorridorIds?.includes(student.corridorId) ||
    blocked.has(student.corridorId)
  ) {
    return false;
  }
  if (student.needsAccessibleVehicle && !transport.accessible) return false;
  return transport.arrivalMin <= student.classStartMin;
}

/**
 * Round-robin across villages after exam-day priority. This avoids one large
 * village consuming every seat just because its student ids sort first.
 */
function fairQueue(
  requests: Array<{ request: RecoveryRequest; student: RecoveryStudent; alternatives: number }>,
): Array<{ request: RecoveryRequest; student: RecoveryStudent; alternatives: number }> {
  const byVillage = new Map<string, typeof requests>();
  for (const item of requests) {
    const group = byVillage.get(item.student.villageId) ?? [];
    group.push(item);
    byVillage.set(item.student.villageId, group);
  }

  const villageOrder = [...byVillage.keys()].sort((a, b) => {
    const firstA = byVillage.get(a)?.[0];
    const firstB = byVillage.get(b)?.[0];
    if (!firstA || !firstB) return stableCompare(a, b);
    return comparePriority(firstA, firstB) || stableCompare(a, b);
  });

  const output: typeof requests = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const villageId of villageOrder) {
      const group = byVillage.get(villageId);
      const next = group?.shift();
      if (next) {
        output.push(next);
        progress = true;
      }
    }
  }
  return output;
}

function comparePriority(
  a: { request: RecoveryRequest; student: RecoveryStudent; alternatives: number },
  b: { request: RecoveryRequest; student: RecoveryStudent; alternatives: number },
): number {
  // 1. Exam day first.
  if (a.student.isExamDay !== b.student.isExamDay) {
    return a.student.isExamDay ? -1 : 1;
  }
  // 2. Students with fewer feasible alternatives first.
  if (a.alternatives !== b.alternatives) return a.alternatives - b.alternatives;
  // 3. Repeatedly unserved students get fairness priority.
  if (a.student.previousUnservedDays !== b.student.previousUnservedDays) {
    return b.student.previousUnservedDays - a.student.previousUnservedDays;
  }
  // 4. Deterministic tie-break.
  return stableCompare(a.student.id, b.student.id) || stableCompare(a.request.id, b.request.id);
}

function canonicalReason(reasons: EligibilityReason[]): UnservedReason {
  if (reasons.includes('no_capacity')) return 'no_capacity';
  if (reasons.includes('too_late')) return 'too_late';
  if (
    reasons.includes('incompatible_route') ||
    reasons.includes('blocked_corridor') ||
    reasons.includes('needs_accessible_vehicle')
  ) {
    return 'incompatible_route';
  }
  return 'no_verified_vehicle';
}

function unservedExplanation(
  reason: UnservedReason,
  student: RecoveryStudent | undefined,
  villageLabel: string,
  classStartMin: number,
): string {
  const village = student?.villageId ?? villageLabel;
  switch (reason) {
    case 'no_capacity':
      return `All verified seats serving ${village} are already allocated. The student stays waitlisted — no overbooking and no invented ride.`;
    case 'too_late':
      return `No verified vehicle can reach college from ${village} by the ${formatMin(classStartMin)} deadline. We will not promise an on-time seat.`;
    case 'incompatible_route':
      return `No verified vehicle with the required route or accessibility can safely serve ${village}.`;
    case 'no_verified_vehicle':
    default:
      return `No verified institution vehicle is available for ${village} right now. The school must escalate honestly.`;
  }
}

// ── Planning ─────────────────────────────────────────────────

/**
 * Produce draft proposals. Drafts do NOT reduce capacity: only confirmed
 * assignments in the snapshot are counted against seats.
 */
export function planRecovery(input: RecoveryInput): RecoveryResult {
  const affected = affectedRequests(input);
  const confirmedAssignments = new Set(
    input.assignments
      .filter((assignment) => assignment.status === 'confirmed')
      .map((assignment) => assignment.requestId),
  );
  const confirmedRequests = new Set(
    affected.filter((request) => request.status === 'confirmed').map((request) => request.id),
  );

  const plannable = affected.filter(
    (request) =>
      !confirmedAssignments.has(request.id) && !confirmedRequests.has(request.id),
  );

  const studentMap = new Map(input.students.map((student) => [student.id, student]));
  const disrupted = disruptedTransportIds(input);
  const blocked = blockedCorridors(input);
  const seatsUsed = confirmedSeatCounts(input);

  const transports = [...input.transports].sort(
    (a, b) => a.arrivalMin - b.arrivalMin || stableCompare(a.id, b.id),
  );

  const queued = plannable.map((request) => {
    const student = studentMap.get(request.studentId);
    const alternatives = student
      ? transports.filter((transport) =>
          basicRouteServes(student, transport, disrupted, blocked),
        ).length
      : 0;
    return {
      request,
      student: student ?? {
        id: request.studentId,
        villageId: 'unknown',
        corridorId: 'unknown',
        classStartMin: input.classStartMin ?? DEFAULT_CLASS_START_MIN,
        needsAccessibleVehicle: false,
        isExamDay: false,
        previousUnservedDays: 0,
      },
      alternatives,
    };
  });

  const examQueue = queued
    .filter((item) => item.student.isExamDay && studentMap.has(item.request.studentId))
    .sort(comparePriority);
  const standardQueue = fairQueue(
    queued
      .filter((item) => !item.student.isExamDay && studentMap.has(item.request.studentId))
      .sort(comparePriority),
  );
  const missingStudentQueue = queued
    .filter((item) => !studentMap.has(item.request.studentId))
    .sort((a, b) => stableCompare(a.request.id, b.request.id));

  const proposals: RecoveryProposal[] = [];
  const unserved: UnservedStudent[] = [];

  for (const item of [...examQueue, ...standardQueue, ...missingStudentQueue]) {
    const { request } = item;
    const student = studentMap.get(request.studentId);

    if (!student) {
      unserved.push({
        requestId: request.id,
        studentId: request.studentId,
        reason: 'no_verified_vehicle',
        explanation:
          'No pseudonymous student record exists for this request, so eligibility cannot be verified.',
      });
      continue;
    }

    const failures: EligibilityReason[] = [];
    let assigned = false;

    for (const transport of transports) {
      const used = seatsUsed.get(transport.id) ?? 0;
      const check = isTransportEligible({
        student,
        transport,
        existingConfirmedAllocations: used,
        disruptedTransportIds: disrupted,
        blockedCorridorIds: blocked,
      });

      if (!check.eligible) {
        if (check.reason) failures.push(check.reason);
        continue;
      }

      proposals.push({
        requestId: request.id,
        studentId: request.studentId,
        transportOptionId: transport.id,
        transportLabel: transport.label,
        explanation: `${transport.label} is verified and serves ${student.villageId}. It departs at ${formatMin(
          transport.departureMin,
        )} and is estimated to arrive at ${formatMin(
          transport.arrivalMin,
        )}, before the ${formatMin(student.classStartMin)} class deadline. This draft does not reserve the seat until a coordinator approves the plan.`,
      });
      seatsUsed.set(transport.id, used + 1);
      assigned = true;
      break;
    }

    if (!assigned) {
      const reason = canonicalReason(failures);
      unserved.push({
        requestId: request.id,
        studentId: request.studentId,
        reason,
        explanation: unservedExplanation(reason, student, student.villageId, student.classStartMin),
      });
    }
  }

  return {
    affectedCount: affected.length,
    proposedCount: proposals.length,
    unservedCount: unserved.length,
    confirmedCount: affected.filter(
      (request) => confirmedAssignments.has(request.id) || request.status === 'confirmed',
    ).length,
    pendingCount: Math.max(
      0,
      affected.length -
        proposals.length -
        affected.filter(
          (request) => confirmedAssignments.has(request.id) || request.status === 'confirmed',
        ).length,
    ),
    proposals,
    unserved,
  };
}

// ── Approval ─────────────────────────────────────────────────

export interface ApprovalProposal {
  requestId: string;
  transportOptionId: string;
  explanation?: string;
}

export interface ApprovalRejection {
  requestId: string;
  reason: string;
  explanation: string;
}

export interface ApprovalResult {
  accepted: Array<ApprovalProposal & { studentId: string; explanation: string }>;
  rejected: ApprovalRejection[];
  /** Requests in confirmed incidents with no confirmed seat after this approval. */
  unservedRequestIds: string[];
  affectedRequestIds: string[];
  seatUsage: Record<string, number>;
}

export interface ApprovalInput extends RecoveryInput {
  proposals: ApprovalProposal[];
}

/**
 * Re-validate a draft plan against current capacity. Safe to call twice:
 * already-confirmed requests are skipped, never duplicated or overbooked.
 */
export function approvePlan(input: ApprovalInput): ApprovalResult {
  const affected = affectedRequests(input);
  const affectedById = new Map(affected.map((request) => [request.id, request]));
  const incidentIds = confirmedIncidentIds(input);
  const disrupted = disruptedTransportIds(input);
  const blocked = blockedCorridors(input);
  const studentMap = new Map(input.students.map((student) => [student.id, student]));
  const transportMap = new Map(input.transports.map((transport) => [transport.id, transport]));

  const seatUsage: Record<string, number> = {};
  for (const [transportId, count] of confirmedSeatCounts(input)) {
    seatUsage[transportId] = count;
  }

  const alreadyConfirmed = new Set(
    input.assignments
      .filter((assignment) => assignment.status === 'confirmed')
      .map((assignment) => assignment.requestId),
  );
  for (const request of affected) {
    if (request.status === 'confirmed') alreadyConfirmed.add(request.id);
  }

  const accepted: ApprovalResult['accepted'] = [];
  const rejected: ApprovalRejection[] = [];
  const seenProposals = new Set<string>();

  for (const proposal of input.proposals) {
    if (!proposal?.requestId || !proposal?.transportOptionId) {
      rejected.push({
        requestId: proposal?.requestId ?? 'unknown',
        reason: 'invalid_proposal',
        explanation: 'Proposal is missing a request or transport id.',
      });
      continue;
    }

    if (seenProposals.has(proposal.requestId)) continue;
    seenProposals.add(proposal.requestId);

    // Idempotent re-approval: never create a duplicate assignment.
    if (alreadyConfirmed.has(proposal.requestId)) continue;

    const request = affectedById.get(proposal.requestId);
    if (!request) {
      rejected.push({
        requestId: proposal.requestId,
        reason: 'request_not_affected',
        explanation: 'This request is not part of a confirmed disruption.',
      });
      continue;
    }

    if (!incidentIds.has(request.incidentId)) {
      rejected.push({
        requestId: proposal.requestId,
        reason: 'incident_not_confirmed',
        explanation: 'The linked incident is no longer confirmed.',
      });
      continue;
    }

    const student = studentMap.get(request.studentId);
    if (!student) {
      rejected.push({
        requestId: proposal.requestId,
        reason: 'student_not_found',
        explanation: 'No student record exists for this request.',
      });
      continue;
    }

    const transport = transportMap.get(proposal.transportOptionId);
    if (!transport) {
      rejected.push({
        requestId: proposal.requestId,
        reason: 'transport_not_found',
        explanation: 'The proposed vehicle no longer exists.',
      });
      continue;
    }

    const check = isTransportEligible({
      student,
      transport,
      existingConfirmedAllocations: seatUsage[transport.id] ?? 0,
      disruptedTransportIds: disrupted,
      blockedCorridorIds: blocked,
    });

    if (!check.eligible) {
      rejected.push({
        requestId: proposal.requestId,
        reason: check.reason ?? 'not_eligible',
        explanation:
          check.explanation ??
          'The vehicle no longer satisfies the recovery constraints. Re-run the engine.',
      });
      continue;
    }

    accepted.push({
      ...proposal,
      studentId: request.studentId,
      explanation:
        proposal.explanation ??
        `Confirmed on ${transport.label}; seat re-validated atomically at approval time.`,
    });
    seatUsage[transport.id] = (seatUsage[transport.id] ?? 0) + 1;
  }

  const acceptedIds = new Set(accepted.map((proposal) => proposal.requestId));
  const unservedRequestIds = affected
    .filter((request) => !alreadyConfirmed.has(request.id) && !acceptedIds.has(request.id))
    .map((request) => request.id);

  return {
    accepted,
    rejected,
    unservedRequestIds,
    affectedRequestIds: affected.map((request) => request.id),
    seatUsage,
  };
}
