// ============================================================
// recoveryData.ts — DB → engine adapter (Person 2)
// Keeps the recovery engine pure: SQLite rows are mapped here.
// ============================================================

import { db } from '../db/client.js';
import type {
  EngineAssignment,
  EngineIncident,
  EngineInput,
  EngineRelayRoute,
  EngineRequest,
  EngineStudent,
  EngineVehicle,
  EngineVillage,
  IncidentStatus,
  IncidentType,
  RequestStatus,
  AssignmentStatus,
} from '../domain/recoveryEngine.js';

/** Demo class start: 09:00. */
export const CLASS_START_MIN = 540;

/** Demo scenario clock: 08:00. Override with DEMO_NOW_MIN if needed. */
export const DEMO_NOW_MIN = (() => {
  const value = Number(process.env.DEMO_NOW_MIN ?? 480);
  return Number.isFinite(value) ? value : 480;
})();

interface VillageRow {
  id: string;
  name: string;
  corridor_id: string;
}

interface TransportRow {
  id: string;
  label: string;
  kind: string;
  status: string;
  verified: number;
  capacity: number;
  occupied_seats: number;
  departure_min: number;
  arrival_min: number;
  accessible: number;
}

interface TransportVillageRow {
  transport_id: string;
  village_id: string;
}

interface BlockedCorridorRow {
  transport_id: string;
  corridor_id: string;
}

interface IncidentRow {
  id: string;
  transport_option_id: string;
  type: string;
  status: string;
}

interface IncidentVillageRow {
  incident_id: string;
  village_id: string;
}

interface RequestRow {
  id: string;
  student_id: string;
  incident_id: string;
  status: string;
  is_exam_day: number | null;
}

interface RelayRouteRow {
  id: string;
  source_village_id: string;
  junction_village_id: string;
  junction_name: string;
  connecting_transport_id: string;
  connecting_label: string;
  connecting_verified: number;
  connecting_status: string;
  walk_distance_km: number;
  corridor_id: string;
}

interface AssignmentRow {
  id: string;
  request_id: string;
  transport_option_id: string;
  status: string;
  explanation: string | null;
}

const INCIDENT_TYPES: ReadonlySet<string> = new Set([
  'no_show',
  'full',
  'breakdown',
  'delay',
  'road_block',
]);

const INCIDENT_STATUSES: ReadonlySet<string> = new Set([
  'reported',
  'confirmed',
  'dismissed',
]);

const REQUEST_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'proposed',
  'confirmed',
  'unserved',
  'escalated',
]);

const ASSIGNMENT_STATUSES: ReadonlySet<string> = new Set([
  'proposed',
  'confirmed',
  'cancelled',
]);

function asIncidentType(value: string): IncidentType {
  return (INCIDENT_TYPES.has(value) ? value : 'breakdown') as IncidentType;
}

function asIncidentStatus(value: string): IncidentStatus {
  return (INCIDENT_STATUSES.has(value) ? value : 'reported') as IncidentStatus;
}

function asRequestStatus(value: string): RequestStatus {
  return (REQUEST_STATUSES.has(value) ? value : 'pending') as RequestStatus;
}

function asAssignmentStatus(value: string): AssignmentStatus {
  return (ASSIGNMENT_STATUSES.has(value) ? value : 'proposed') as AssignmentStatus;
}

export function loadVillages(): EngineVillage[] {
  const rows = db
    .prepare('SELECT id, name, corridor_id FROM villages ORDER BY id')
    .all() as VillageRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    corridorId: row.corridor_id,
  }));
}

export function loadVehicles(): EngineVehicle[] {
  const rows = db
    .prepare(
      `SELECT id, label, kind, status, verified, capacity, occupied_seats,
              departure_min, arrival_min, accessible
       FROM transport_options
       ORDER BY id`,
    )
    .all() as TransportRow[];

  const routeRows = db
    .prepare('SELECT transport_id, village_id FROM transport_villages')
    .all() as TransportVillageRow[];
  const blockedRows = db
    .prepare('SELECT transport_id, corridor_id FROM transport_blocked_corridors')
    .all() as BlockedCorridorRow[];

  const routes = new Map<string, string[]>();
  for (const row of routeRows) {
    const list = routes.get(row.transport_id) ?? [];
    list.push(row.village_id);
    routes.set(row.transport_id, list);
  }

  const blocked = new Map<string, string[]>();
  for (const row of blockedRows) {
    const list = blocked.get(row.transport_id) ?? [];
    list.push(row.corridor_id);
    blocked.set(row.transport_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    verified: row.verified === 1,
    status: row.status === 'delayed' || row.status === 'cancelled' ? row.status : 'active',
    villageIds: (routes.get(row.id) ?? []).sort(),
    accessible: row.accessible === 1,
    capacity: row.capacity,
    occupiedSeats: row.occupied_seats,
    arrivalMin: row.arrival_min,
    blockedCorridorIds: (blocked.get(row.id) ?? []).sort(),
  }));
}

export function loadIncidents(): EngineIncident[] {
  const rows = db
    .prepare(
      `SELECT id, transport_option_id, type, status
       FROM incidents
       ORDER BY id`,
    )
    .all() as IncidentRow[];
  const villageRows = db
    .prepare('SELECT incident_id, village_id FROM incident_villages')
    .all() as IncidentVillageRow[];

  const villagesByIncident = new Map<string, string[]>();
  for (const row of villageRows) {
    const list = villagesByIncident.get(row.incident_id) ?? [];
    list.push(row.village_id);
    villagesByIncident.set(row.incident_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    transportOptionId: row.transport_option_id,
    type: asIncidentType(row.type),
    status: asIncidentStatus(row.status),
    affectedVillageIds: (villagesByIncident.get(row.id) ?? []).sort(),
  }));
}

export function loadRequests(): EngineRequest[] {
  const rows = db
    .prepare(
      `SELECT id, student_id, incident_id, status, is_exam_day
       FROM help_requests
       ORDER BY id`,
    )
    .all() as RequestRow[];

  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    incidentId: row.incident_id,
    status: asRequestStatus(row.status),
    isExamDay: row.is_exam_day === 1,
  }));
}

/** Config-driven junction relays for blocked corridors. */
export function loadRelayRoutes(): EngineRelayRoute[] {
  const rows = db
    .prepare(
      `SELECT rr.id,
              rr.source_village_id,
              rr.junction_village_id,
              jv.name AS junction_name,
              rr.connecting_transport_id,
              t.label AS connecting_label,
              t.verified AS connecting_verified,
              t.status AS connecting_status,
              rr.walk_distance_km,
              rr.corridor_id
       FROM relay_routes rr
       JOIN villages jv ON jv.id = rr.junction_village_id
       JOIN transport_options t ON t.id = rr.connecting_transport_id
       ORDER BY rr.id`,
    )
    .all() as RelayRouteRow[];

  return rows.map((row) => ({
    id: row.id,
    sourceVillageId: row.source_village_id,
    junctionVillageId: row.junction_village_id,
    junctionName: row.junction_name,
    connectingTransportId: row.connecting_transport_id,
    connectingLabel: row.connecting_label,
    connectingVerified: row.connecting_verified === 1,
    connectingStatus:
      row.connecting_status === 'delayed' || row.connecting_status === 'cancelled'
        ? row.connecting_status
        : 'active',
    walkDistanceKm: row.walk_distance_km,
    corridorId: row.corridor_id,
  }));
}

export function loadAssignments(): EngineAssignment[] {
  const rows = db
    .prepare(
      `SELECT id, request_id, transport_option_id, status, explanation
       FROM assignments
       ORDER BY id`,
    )
    .all() as AssignmentRow[];

  return rows.map((row) => ({
    id: row.id,
    requestId: row.request_id,
    transportOptionId: row.transport_option_id,
    status: asAssignmentStatus(row.status),
    explanation: row.explanation ?? undefined,
  }));
}

/**
 * There is no students table in the demo schema.
 * A student's village is derived from their request's incident:
 *  1. affected villages of the incident,
 *  2. villages served by the incident vehicle,
 *  3. any configured village (last-resort demo fallback).
 *
 * Class start and accessibility default to the demo values; the exam-day
 * flag is carried on each request (help_requests.is_exam_day).
 */
export function deriveStudents(
  requests: readonly EngineRequest[],
  incidents: readonly EngineIncident[],
  vehicles: readonly EngineVehicle[],
  villages: readonly EngineVillage[],
): EngineStudent[] {
  const villageIds = new Set(villages.map((village) => village.id));
  const incidentById = new Map(incidents.map((incident) => [incident.id, incident]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const fallbackVillageId = villages[0]?.id;

  const examByStudent = new Map<string, boolean>();
  for (const request of requests) {
    if (request.isExamDay) examByStudent.set(request.studentId, true);
  }

  const students = new Map<string, EngineStudent>();
  const sortedRequests = [...requests].sort((a, b) => a.id.localeCompare(b.id));

  for (const request of sortedRequests) {
    if (students.has(request.studentId)) continue;

    const incident = incidentById.get(request.incidentId);
    const vehicle = incident ? vehicleById.get(incident.transportOptionId) : undefined;
    const candidates = [
      ...(incident?.affectedVillageIds ?? []),
      ...(vehicle?.villageIds ?? []),
      ...(fallbackVillageId ? [fallbackVillageId] : []),
    ];
    const villageId = candidates.find((id) => villageIds.has(id));
    if (!villageId) continue;

    students.set(request.studentId, {
      id: request.studentId,
      villageId,
      classStartMin: CLASS_START_MIN,
      isExamDay: examByStudent.get(request.studentId) ?? false,
      needsAccessibleVehicle: false,
    });
  }

  return [...students.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** One consistent snapshot for the engine, metrics, and approval re-check. */
export function loadEngineInput(): EngineInput {
  const villages = loadVillages();
  const vehicles = loadVehicles();
  const incidents = loadIncidents();
  const requests = loadRequests();
  const assignments = loadAssignments();

  return {
    villages,
    students: deriveStudents(requests, incidents, vehicles, villages),
    vehicles,
    incidents,
    requests,
    assignments,
    relayRoutes: loadRelayRoutes(),
  };
}
