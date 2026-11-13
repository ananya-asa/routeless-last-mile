/**
 * ROUTELESS — deterministic recovery engine (Person 2).
 * Pure TypeScript: no DB, no Hono, no React.
 *
 * Rules implemented (spec §7):
 *  - dedupe student + incident
 *  - confirmed incidents only
 *  - verified, active, non-disrupted vehicles only
 *  - village coverage + open corridor + accessibility
 *  - arrival at or before class start (zero grace on exam days)
 *  - draft seats never reduce confirmed capacity
 *  - exam day → fewer alternatives → round-robin across villages
 *  - stable tie-break by student id
 */

import type {
  EligibilityStudent,
  EligibilityVehicle,
  EligibilityVillage,
  UnservedReason,
} from './eligibility.js';
import { bestUnservedReason, checkEligibility } from './eligibility.js';

export type IncidentType = 'no_show' | 'full' | 'breakdown' | 'delay' | 'road_block';
export type IncidentStatus = 'reported' | 'confirmed' | 'dismissed';
export type RequestStatus = 'pending' | 'proposed' | 'confirmed' | 'unserved' | 'escalated';
export type AssignmentStatus = 'proposed' | 'confirmed' | 'cancelled';

export type EngineVillage = EligibilityVillage;
export type EngineStudent = EligibilityStudent;
export type EngineVehicle = EligibilityVehicle;

export interface EngineIncident {
  id: string;
  transportOptionId: string;
  type: IncidentType;
  status: IncidentStatus;
  affectedVillageIds: string[];
}

export interface EngineRequest {
  id: string;
  studentId: string;
  incidentId: string;
  status: RequestStatus;
  /** Exam-day flag carried on the request (help_requests.is_exam_day). */
  isExamDay?: boolean;
}

/**
 * Config-driven junction relay for a blocked corridor.
 * Mirrors a row of the `relay_routes` table; the engine stays DB-free.
 */
export interface EngineRelayRoute {
  id?: string;
  sourceVillageId: string;
  junctionVillageId: string;
  junctionName: string;
  connectingTransportId: string;
  connectingLabel: string;
  connectingVerified: boolean;
  /** A cancelled connecting vehicle cannot be offered as a relay. */
  connectingStatus?: 'active' | 'delayed' | 'cancelled';
  walkDistanceKm: number;
  corridorId: string;
}

export interface EngineAssignment {
  id: string;
  requestId: string;
  transportOptionId: string;
  status: AssignmentStatus;
  explanation?: string;
}

export interface EngineInput {
  villages: EngineVillage[];
  students: EngineStudent[];
  vehicles: EngineVehicle[];
  incidents: EngineIncident[];
  requests: EngineRequest[];
  /** Confirmed assignments only; drafts never consume seats. */
  assignments?: EngineAssignment[];
  /** Optional dry-path relay config for blocked corridors. */
  relayRoutes?: EngineRelayRoute[];
  nowMin?: number;
}

export interface Proposal {
  requestId: string;
  studentId: string;
  isExamDay: boolean;
  transportOptionId: string;
  transportLabel: string;
  explanation: string;
  arrivalMin: number;
}

export interface UnservedStudent {
  requestId: string;
  studentId: string;
  isExamDay: boolean;
  reason: UnservedReason;
  explanation: string;
  /** Config-driven dry-path relay when a corridor is blocked. */
  relayAlternative?: string;
}

export interface RecoveryResult {
  affectedCount: number;
  proposedCount: number;
  unservedCount: number;
  /** Number of affected students sitting an exam today. */
  examStudentCount: number;
  proposals: Proposal[];
  unserved: UnservedStudent[];
}

export type ApprovalFailureReason =
  | 'already_assigned'
  | 'incident_not_confirmed'
  | 'no_capacity'
  | 'ineligible'
  | 'stale_plan'
  | 'invalid_proposal';

export interface ApprovalProposalInput {
  requestId: string;
  transportOptionId: string;
  explanation?: string;
}

export interface ApprovalResult {
  ok: boolean;
  /** Confirmed copies of the proposals. Empty when `ok` is false — atomic. */
  assignments: EngineAssignment[];
  reason?: ApprovalFailureReason;
  message: string;
  conflicts: string[];
}

const PLANNABLE: ReadonlySet<RequestStatus> = new Set(['pending', 'proposed', 'unserved']);

const FAILURE_PRIORITY: ApprovalFailureReason[] = [
  'already_assigned',
  'incident_not_confirmed',
  'no_capacity',
  'ineligible',
  'stale_plan',
  'invalid_proposal',
];

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

export function getDisruptedVehicleIds(incidents: readonly EngineIncident[]): Set<string> {
  return new Set(
    incidents
      .filter((incident) => incident.status === 'confirmed')
      .map((incident) => incident.transportOptionId),
  );
}

export function getClosedCorridorIds(
  incidents: readonly EngineIncident[],
  villages: readonly EngineVillage[],
): Set<string> {
  const villageById = new Map(villages.map((village) => [village.id, village]));
  const closed = new Set<string>();
  for (const incident of incidents) {
    if (incident.status !== 'confirmed' || incident.type !== 'road_block') continue;
    for (const villageId of incident.affectedVillageIds) {
      const village = villageById.get(villageId);
      if (village) closed.add(village.corridorId);
    }
  }
  return closed;
}

export function confirmedAssignments(
  assignments: readonly EngineAssignment[] = [],
): EngineAssignment[] {
  return assignments.filter((assignment) => assignment.status === 'confirmed');
}

/** Counts each request once, even if a bad write duplicated it. */
export function seatUsageFor(
  vehicle: EngineVehicle,
  assignments: readonly EngineAssignment[] = [],
): number {
  const requestIds = new Set(
    confirmedAssignments(assignments)
      .filter((assignment) => assignment.transportOptionId === vehicle.id)
      .map((assignment) => assignment.requestId),
  );
  return Math.min(vehicle.capacity, vehicle.occupiedSeats + requestIds.size);
}

export function availableSeatsFor(
  vehicle: EngineVehicle,
  input: Pick<EngineInput, 'assignments'>,
): number {
  return Math.max(0, vehicle.capacity - seatUsageFor(vehicle, input.assignments));
}

/** Cancelling a confirmed assignment releases exactly one seat on the next run. */
export function cancelAssignment(
  assignments: readonly EngineAssignment[],
  assignmentId: string,
): EngineAssignment[] {
  return assignments.map((assignment) =>
    assignment.id === assignmentId
      ? { ...assignment, status: 'cancelled' as const }
      : assignment,
  );
}

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

interface QueueEntry {
  request: EngineRequest;
  student: EngineStudent;
  village: EngineVillage;
  incident: EngineIncident;
  alternatives: number;
}

function roundRobinByVillage(entries: readonly QueueEntry[]): QueueEntry[] {
  const groups = new Map<string, QueueEntry[]>();
  const sorted = [...entries].sort(
    (a, b) =>
      a.student.id.localeCompare(b.student.id) || a.request.id.localeCompare(b.request.id),
  );

  for (const entry of sorted) {
    const list = groups.get(entry.village.id) ?? [];
    list.push(entry);
    groups.set(entry.village.id, list);
  }

  const villageIds = [...groups.keys()].sort();
  const output: QueueEntry[] = [];
  let added = true;

  while (added) {
    added = false;
    for (const villageId of villageIds) {
      const next = groups.get(villageId)?.shift();
      if (next) {
        output.push(next);
        added = true;
      }
    }
  }

  return output;
}

function buildQueue(input: EngineInput): QueueEntry[] {
  const studentById = new Map(input.students.map((student) => [student.id, student]));
  const villageById = new Map(input.villages.map((village) => [village.id, village]));
  const incidentById = new Map(input.incidents.map((incident) => [incident.id, incident]));
  const disrupted = getDisruptedVehicleIds(input.incidents);
  const closed = getClosedCorridorIds(input.incidents, input.villages);

  const seenStudentIncident = new Set<string>();
  const entries: QueueEntry[] = [];

  for (const request of [...input.requests].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!PLANNABLE.has(request.status)) continue;

    const incident = incidentById.get(request.incidentId);
    if (!incident || incident.status !== 'confirmed') continue;

    const student = studentById.get(request.studentId);
    const village = student ? villageById.get(student.villageId) : undefined;
    if (!student || !village) continue;

    const dedupeKey = `${student.id}::${incident.id}`;
    if (seenStudentIncident.has(dedupeKey)) continue;
    seenStudentIncident.add(dedupeKey);

    const alternatives = input.vehicles.filter(
      (vehicle) =>
        checkEligibility({
          student,
          village,
          vehicle,
          availableSeats: 1,
          disruptedVehicleIds: disrupted,
          closedCorridorIds: closed,
        }).eligible,
    ).length;

    entries.push({ request, student, village, incident, alternatives });
  }

  const roundRobin = roundRobinByVillage(entries);

  // Stable sort: exam day first, then fewer alternatives, then round-robin order.
  return roundRobin.sort(
    (a, b) =>
      Number(b.student.isExamDay) - Number(a.student.isExamDay) ||
      a.alternatives - b.alternatives,
  );
}

function buildExplanation(
  entry: QueueEntry,
  vehicle: EngineVehicle,
): string {
  const graceMinutes = entry.student.isExamDay ? 0 : 10;
  const deadlineMin = entry.student.classStartMin + graceMinutes;
  const parts = [
    `${vehicle.label} is verified and covers ${entry.village.name}.`,
    `It arrives at ${formatClock(vehicle.arrivalMin)}, by the ${formatClock(deadlineMin)} deadline.`,
  ];
  if (entry.student.isExamDay) parts.push('Exam day: zero grace applied.');
  if (entry.student.needsAccessibleVehicle && vehicle.accessible) {
    parts.push('Step-free access confirmed.');
  }
  return parts.join(' ');
}

function explainUnserved(entry: QueueEntry, reason: UnservedReason): string {
  const examNote = entry.student.isExamDay ? ' Exam day: zero grace.' : '';
  switch (reason) {
    case 'no_capacity':
      return `Every verified vehicle covering ${entry.village.name} is full. Draft seats are never overbooked.${examNote}`;
    case 'too_late':
      return `The earliest verified arrival for ${entry.village.name} is after the ${formatClock(entry.student.classStartMin)} class start.${examNote}`;
    case 'route_blocked':
      return `The road corridor serving ${entry.village.name} is blocked. Direct vehicle transit is suspended.${examNote}`;
    case 'incompatible_route':
      return `No verified vehicle covers ${entry.village.name} with the required access.`;
    case 'no_verified_vehicle':
    default:
      return `No verified, active vehicle is available for ${entry.village.name}.`;
  }
}

/**
 * Looks up the configured dry-path relay for a blocked corridor.
 * Only verified connecting vehicles are offered as a safe alternative.
 */
function relayAlternativeFor(
  entry: QueueEntry,
  relayRoutes: readonly EngineRelayRoute[],
): string {
  const matched = relayRoutes.find(
    (route) =>
      route.sourceVillageId === entry.student.villageId &&
      route.corridorId === entry.village.corridorId,
  );

  if (
    !matched ||
    !matched.connectingVerified ||
    matched.connectingStatus === 'cancelled'
  ) {
    return 'No safe dry bypass configured for this village corridor.';
  }

  const walk = Number.isInteger(matched.walkDistanceKm)
    ? String(matched.walkDistanceKm)
    : matched.walkDistanceKm.toFixed(1);

  return `Config-driven relay: walk ${walk}km on the dry path to ${matched.junctionName} -> board verified ${matched.connectingLabel}.`;
}

/**
 * Runs one deterministic allocation pass.
 * Same input → same output, including ordering.
 */
export function planRecovery(input: EngineInput): RecoveryResult {
  const queue = buildQueue(input);
  const disrupted = getDisruptedVehicleIds(input.incidents);
  const closed = getClosedCorridorIds(input.incidents, input.villages);

  const baseAvailable = new Map(
    input.vehicles.map((vehicle) => [vehicle.id, availableSeatsFor(vehicle, input)]),
  );
  const draftUsed = new Map<string, number>();

  const proposals: Proposal[] = [];
  const unserved: UnservedStudent[] = [];

  for (const entry of queue) {
    const failures: Array<UnservedReason | undefined> = [];

    const candidates = input.vehicles
      .map((vehicle) => {
        const used = draftUsed.get(vehicle.id) ?? 0;
        const seatsLeft = Math.max(0, (baseAvailable.get(vehicle.id) ?? 0) - used);
        const result = checkEligibility({
          student: entry.student,
          village: entry.village,
          vehicle,
          availableSeats: seatsLeft,
          disruptedVehicleIds: disrupted,
          closedCorridorIds: closed,
        });
        if (!result.eligible) failures.push(result.reason);
        return { vehicle, result, seatsLeft };
      })
      .filter((candidate) => candidate.result.eligible)
      // Earliest arrival, then most free seats, then stable vehicle id.
      .sort(
        (a, b) =>
          a.vehicle.arrivalMin - b.vehicle.arrivalMin ||
          b.seatsLeft - a.seatsLeft ||
          a.vehicle.id.localeCompare(b.vehicle.id),
      );

    const best = candidates[0];
    if (best) {
      draftUsed.set(best.vehicle.id, (draftUsed.get(best.vehicle.id) ?? 0) + 1);
      proposals.push({
        requestId: entry.request.id,
        studentId: entry.student.id,
        isExamDay: entry.student.isExamDay,
        transportOptionId: best.vehicle.id,
        transportLabel: best.vehicle.label,
        explanation: buildExplanation(entry, best.vehicle),
        arrivalMin: best.vehicle.arrivalMin,
      });
      continue;
    }

    const reason: UnservedReason =
      input.vehicles.length === 0 ? 'no_verified_vehicle' : bestUnservedReason(failures);

    unserved.push({
      requestId: entry.request.id,
      studentId: entry.student.id,
      isExamDay: entry.student.isExamDay,
      reason,
      explanation: explainUnserved(entry, reason),
      ...(reason === 'route_blocked'
        ? { relayAlternative: relayAlternativeFor(entry, input.relayRoutes ?? []) }
        : {}),
    });
  }

  return {
    affectedCount: queue.length,
    proposedCount: proposals.length,
    unservedCount: unserved.length,
    examStudentCount: queue.filter((entry) => entry.student.isExamDay).length,
    proposals,
    unserved,
  };
}

/* ------------------------------------------------------------------ */
/* Atomic approval                                                     */
/* ------------------------------------------------------------------ */

function pickFailureReason(reasons: readonly ApprovalFailureReason[]): ApprovalFailureReason {
  for (const reason of FAILURE_PRIORITY) {
    if (reasons.includes(reason)) return reason;
  }
  return 'invalid_proposal';
}

/**
 * Validates a draft and returns confirmed copies of its proposals.
 * All-or-nothing: one conflict rejects the whole plan, so no seat is overbooked.
 */
export function approveProposals(
  proposals: readonly ApprovalProposalInput[],
  input: EngineInput,
): ApprovalResult {
  if (proposals.length === 0) {
    return {
      ok: false,
      assignments: [],
      reason: 'invalid_proposal',
      message: 'No proposals supplied.',
      conflicts: ['proposals=[]'],
    };
  }

  const studentById = new Map(input.students.map((student) => [student.id, student]));
  const villageById = new Map(input.villages.map((village) => [village.id, village]));
  const vehicleById = new Map(input.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const requestById = new Map(input.requests.map((request) => [request.id, request]));
  const incidentById = new Map(input.incidents.map((incident) => [incident.id, incident]));
  const disrupted = getDisruptedVehicleIds(input.incidents);
  const closed = getClosedCorridorIds(input.incidents, input.villages);
  const alreadyConfirmed = new Set(
    input.requests.filter((request) => request.status === 'confirmed').map((request) => request.id),
  );

  const perVehicle = new Map<string, number>();
  const seenRequests = new Set<string>();
  const failures: Array<{ reason: ApprovalFailureReason; message: string }> = [];
  const validated: EngineAssignment[] = [];

  for (const proposal of proposals) {
    const request = requestById.get(proposal.requestId);
    const vehicle = vehicleById.get(proposal.transportOptionId);

    if (!request || !vehicle) {
      failures.push({
        reason: 'invalid_proposal',
        message: `Proposal references a missing request or vehicle (${proposal.requestId}).`,
      });
      continue;
    }

    if (seenRequests.has(request.id)) {
      failures.push({
        reason: 'stale_plan',
        message: `Request ${request.id} appears twice in the plan.`,
      });
      continue;
    }
    seenRequests.add(request.id);

    if (request.status === 'confirmed' || alreadyConfirmed.has(request.id)) {
      failures.push({
        reason: 'already_assigned',
        message: `Request ${request.id} is already confirmed; refusing a duplicate seat.`,
      });
      continue;
    }

    const incident = incidentById.get(request.incidentId);
    if (!incident || incident.status !== 'confirmed') {
      failures.push({
        reason: 'incident_not_confirmed',
        message: `Request ${request.id} no longer belongs to a confirmed incident.`,
      });
      continue;
    }

    const student = studentById.get(request.studentId);
    const village = student ? villageById.get(student.villageId) : undefined;
    if (!student || !village) {
      failures.push({
        reason: 'ineligible',
        message: `Request ${request.id} has no resolvable student or village.`,
      });
      continue;
    }

    const eligibility = checkEligibility({
      student,
      village,
      vehicle,
      availableSeats: 1, // capacity is checked atomically below
      disruptedVehicleIds: disrupted,
      closedCorridorIds: closed,
    });
    if (!eligibility.eligible) {
      failures.push({
        reason: 'ineligible',
        message: `${vehicle.label} is no longer eligible: ${eligibility.explanation}`,
      });
      continue;
    }

    const used = perVehicle.get(vehicle.id) ?? 0;
    const available = availableSeatsFor(vehicle, input);
    if (used + 1 > available) {
      failures.push({
        reason: 'no_capacity',
        message: `${vehicle.label} has ${available} free seat(s) but the plan needs ${used + 1}.`,
      });
      continue;
    }

    perVehicle.set(vehicle.id, used + 1);
    validated.push({
      id: `ASG-${request.id}`,
      requestId: request.id,
      transportOptionId: vehicle.id,
      status: 'confirmed',
      explanation:
        proposal.explanation ||
        `${vehicle.label} is verified, serves ${village.name}, and arrives before the class start.`,
    });
  }

  if (failures.length > 0) {
    const reason = pickFailureReason(failures.map((failure) => failure.reason));
    return {
      ok: false,
      assignments: [],
      reason,
      message: `Plan rejected: ${failures[0].message}`,
      conflicts: failures.map((failure) => failure.message),
    };
  }

  return {
    ok: true,
    assignments: validated,
    message: `Plan approved atomically: ${validated.length} confirmed seat(s).`,
    conflicts: [],
  };
}

function formatClock(minutes: number): string {
  const safe = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
