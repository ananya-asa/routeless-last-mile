import type {
  EngineAssignment,
  EngineIncident,
  EngineRequest,
  EngineStudent,
  EngineVehicle,
  EngineVillage,
} from '../domain/recoveryEngine.js';

/**
 * Person 2's local mock builders.
 * No DB and no Person 1 fixture imports — the engine tests stay unblocked.
 */

export const CLASS_START_MIN = 540; // 09:00

export const VILLAGE_A: EngineVillage = { id: 'VLG-A', name: 'Village A', corridorId: 'CRD-NORTH' };
export const VILLAGE_B: EngineVillage = { id: 'VLG-B', name: 'Village B', corridorId: 'CRD-NORTH' };
export const VILLAGE_C: EngineVillage = { id: 'VLG-C', name: 'Village C', corridorId: 'CRD-SOUTH' };

export function makeStudent(
  id: string,
  villageId: string = VILLAGE_C.id,
  overrides: Partial<EngineStudent> = {},
): EngineStudent {
  return {
    id,
    villageId,
    classStartMin: CLASS_START_MIN,
    isExamDay: false,
    needsAccessibleVehicle: false,
    ...overrides,
  };
}

export function makeStudents(count: number, villageId: string = VILLAGE_C.id): EngineStudent[] {
  return Array.from({ length: count }, (_, index) =>
    makeStudent(`STU-${String(index + 1).padStart(3, '0')}`, villageId),
  );
}

export function busB2(overrides: Partial<EngineVehicle> = {}): EngineVehicle {
  return {
    id: 'BUS-B2',
    label: 'Bus B2 — Village C Direct',
    verified: true,
    status: 'active',
    villageIds: [VILLAGE_C.id],
    accessible: false,
    capacity: 40,
    occupiedSeats: 28,
    arrivalMin: 510,
    blockedCorridorIds: [],
    ...overrides,
  };
}

export function vanV1(overrides: Partial<EngineVehicle> = {}): EngineVehicle {
  return {
    id: 'VAN-V1',
    label: 'Van V1 — School Backup (Village C)',
    verified: true,
    status: 'active',
    villageIds: [VILLAGE_C.id],
    accessible: true,
    capacity: 10,
    occupiedSeats: 2,
    arrivalMin: 530,
    blockedCorridorIds: [],
    ...overrides,
  };
}

export function makeIncident(
  id: string,
  transportOptionId: string,
  overrides: Partial<EngineIncident> = {},
): EngineIncident {
  return {
    id,
    transportOptionId,
    type: 'breakdown',
    status: 'confirmed',
    affectedVillageIds: [VILLAGE_C.id],
    ...overrides,
  };
}

export function makeRequest(
  id: string,
  studentId: string,
  incidentId: string,
  overrides: Partial<EngineRequest> = {},
): EngineRequest {
  return {
    id,
    studentId,
    incidentId,
    status: 'pending',
    ...overrides,
  };
}

export function makeAssignment(
  id: string,
  requestId: string,
  transportOptionId: string,
  overrides: Partial<EngineAssignment> = {},
): EngineAssignment {
  return {
    id,
    requestId,
    transportOptionId,
    status: 'confirmed',
    explanation: 'Test fixture assignment',
    ...overrides,
  };
}

export interface Scenario {
  villages: EngineVillage[];
  students: EngineStudent[];
  vehicles: EngineVehicle[];
  incidents: EngineIncident[];
  requests: EngineRequest[];
  assignments: EngineAssignment[];
}

/** Spec showcase: 12 Village C requests, B2 breakdown, V1 has 8 free seats. */
export function villageCScenario(requestCount = 12): Scenario {
  const students = makeStudents(requestCount);
  const incident = makeIncident('INC-B2-BREAKDOWN', 'BUS-B2', {
    type: 'breakdown',
    status: 'confirmed',
    affectedVillageIds: [VILLAGE_C.id],
  });

  const requests = students.map((student, index) =>
    makeRequest(
      `REQ-${String(index + 1).padStart(3, '0')}`,
      student.id,
      incident.id,
    ),
  );

  return {
    villages: [VILLAGE_A, VILLAGE_B, VILLAGE_C],
    students,
    vehicles: [busB2(), vanV1()],
    incidents: [incident],
    requests,
    assignments: [],
  };
}
