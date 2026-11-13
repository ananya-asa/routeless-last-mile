import { describe, expect, it } from 'vitest';
import { computeMetrics } from '../domain/metrics.js';
import {
  approveProposals,
  availableSeatsFor,
  cancelAssignment,
  planRecovery,
  type EngineInput,
} from '../domain/recoveryEngine.js';
import {
  busB2,
  makeIncident,
  makeRequest,
  makeStudent,
  makeStudents,
  vanV1,
  VILLAGE_A,
  VILLAGE_B,
  VILLAGE_C,
  villageCScenario,
  type Scenario,
} from './builders.js';

function inputFrom(
  scenario: Scenario,
  overrides: Partial<EngineInput> = {},
): EngineInput {
  return {
    villages: scenario.villages,
    students: scenario.students,
    vehicles: scenario.vehicles,
    incidents: scenario.incidents,
    requests: scenario.requests,
    assignments: scenario.assignments,
    ...overrides,
  };
}

describe('ROUTELESS recovery engine', () => {
  it('A — 12 Village C requests + V1 with 8 seats gives 8 proposed and 4 unserved', () => {
    const plan = planRecovery(inputFrom(villageCScenario()));

    expect(plan.affectedCount).toBe(12);
    expect(plan.proposals).toHaveLength(8);
    expect(plan.unserved).toHaveLength(4);
    expect(new Set(plan.proposals.map((proposal) => proposal.requestId)).size).toBe(8);
    expect(plan.proposals.every((proposal) => proposal.transportOptionId === 'VAN-V1')).toBe(true);
    expect(plan.unserved.every((entry) => entry.reason === 'no_capacity')).toBe(true);
  });

  it('B — zero backup vehicles gives 0 proposed and 12 unserved', () => {
    const plan = planRecovery(inputFrom(villageCScenario(), { vehicles: [busB2()] }));

    expect(plan.proposals).toHaveLength(0);
    expect(plan.unserved).toHaveLength(12);
    expect(plan.unserved.every((entry) => entry.reason === 'no_verified_vehicle')).toBe(true);
  });

  it('C — an unverified vehicle is never assigned', () => {
    const plan = planRecovery(
      inputFrom(villageCScenario(), {
        vehicles: [busB2(), vanV1({ verified: false })],
      }),
    );

    expect(plan.proposals).toHaveLength(0);
    expect(plan.unserved).toHaveLength(12);
    expect(plan.unserved.every((entry) => entry.reason === 'no_verified_vehicle')).toBe(true);
  });

  it('D — a vehicle that excludes Village C is ineligible even with free seats', () => {
    const plan = planRecovery(
      inputFrom(villageCScenario(), {
        vehicles: [busB2(), vanV1({ villageIds: [VILLAGE_A.id] })],
      }),
    );

    expect(plan.proposals).toHaveLength(0);
    expect(plan.unserved).toHaveLength(12);
    expect(plan.unserved.every((entry) => entry.reason === 'incompatible_route')).toBe(true);
  });

  it('E — an ETA after exam start is ineligible (zero grace)', () => {
    const scenario = villageCScenario();
    const plan = planRecovery(
      inputFrom(scenario, {
        students: scenario.students.map((student) => ({ ...student, isExamDay: true })),
        vehicles: [busB2(), vanV1({ arrivalMin: 545 })],
      }),
    );

    expect(plan.proposals).toHaveLength(0);
    expect(plan.unserved).toHaveLength(12);
    expect(plan.unserved.every((entry) => entry.reason === 'too_late')).toBe(true);
  });

  it('F — two incidents sharing one van never exceed available seats', () => {
    const students = makeStudents(12);
    const incidentA = makeIncident('INC-B2-BREAKDOWN', 'BUS-B2');
    const incidentB = makeIncident('INC-B4-BREAKDOWN', 'BUS-B4', {
      affectedVillageIds: [VILLAGE_C.id],
    });
    const busB4 = busB2({ id: 'BUS-B4', label: 'Bus B4 — Government bus', occupiedSeats: 30 });

    const requests = students.map((student, index) =>
      makeRequest(
        `REQ-${String(index + 1).padStart(3, '0')}`,
        student.id,
        index < 6 ? incidentA.id : incidentB.id,
      ),
    );

    const plan = planRecovery({
      villages: [VILLAGE_A, VILLAGE_C],
      students,
      vehicles: [busB2(), busB4, vanV1()],
      incidents: [incidentA, incidentB],
      requests,
      assignments: [],
    });

    const seatsByVehicle = new Map<string, number>();
    for (const proposal of plan.proposals) {
      seatsByVehicle.set(
        proposal.transportOptionId,
        (seatsByVehicle.get(proposal.transportOptionId) ?? 0) + 1,
      );
    }

    expect(plan.proposals).toHaveLength(8);
    expect(plan.unserved).toHaveLength(4);
    expect(seatsByVehicle.get('VAN-V1')).toBe(8);
    expect(new Set(plan.proposals.map((proposal) => proposal.requestId)).size).toBe(
      plan.proposals.length,
    );
  });

  it('G — approving twice never duplicates or overbooks', () => {
    const input = inputFrom(villageCScenario());
    const plan = planRecovery(input);

    const first = approveProposals(plan.proposals, input);
    expect(first.ok).toBe(true);
    expect(first.assignments).toHaveLength(8);
    expect(first.assignments.every((assignment) => assignment.status === 'confirmed')).toBe(true);

    const approvedRequestIds = new Set(first.assignments.map((assignment) => assignment.requestId));
    const after = inputFrom(villageCScenario(), {
      assignments: first.assignments,
      requests: input.requests.map((request) =>
        approvedRequestIds.has(request.id)
          ? { ...request, status: 'confirmed' as const }
          : request,
      ),
    });

    const second = approveProposals(plan.proposals, after);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('already_assigned');
    expect(second.assignments).toHaveLength(0);

    const metrics = computeMetrics(after);
    expect(metrics.seatUsage['VAN-V1']).toBe(10);
    expect(metrics.confirmedPlacements).toBe(8);
    expect(metrics.unserved).toBe(4);
    expect(metrics.seatUsage['VAN-V1']).toBeLessThanOrEqual(10);
  });

  it('H — cancelling one confirmed assignment releases exactly one seat', () => {
    const input = inputFrom(villageCScenario());
    const plan = planRecovery(input);
    const approved = approveProposals(plan.proposals, input).assignments;
    expect(approved).toHaveLength(8);

    const cancelled = approved[0];
    const afterCancel = cancelAssignment(approved, cancelled.id);

    expect(availableSeatsFor(vanV1(), { assignments: approved })).toBe(0);
    expect(availableSeatsFor(vanV1(), { assignments: afterCancel })).toBe(1);

    const approvedRequestIds = new Set(approved.map((assignment) => assignment.requestId));
    const requestsAfterCancel = input.requests.map((request) => {
      if (request.id === cancelled.requestId) return { ...request, status: 'pending' as const };
      if (approvedRequestIds.has(request.id)) return { ...request, status: 'confirmed' as const };
      return { ...request, status: 'escalated' as const };
    });

    const replanned = planRecovery({
      ...input,
      assignments: afterCancel,
      requests: requestsAfterCancel,
    });

    expect(replanned.proposals).toHaveLength(1);
    expect(replanned.proposals[0].requestId).toBe(cancelled.requestId);
  });

  it('I — an unconfirmed incident produces no allocation', () => {
    const scenario = villageCScenario();
    const input = inputFrom(scenario, {
      incidents: scenario.incidents.map((incident) => ({
        ...incident,
        status: 'reported' as const,
      })),
    });

    const plan = planRecovery(input);
    expect(plan.proposals).toHaveLength(0);
    expect(plan.unserved).toHaveLength(0);
    expect(computeMetrics(input).affectedRequests).toBe(0);
  });

  it('J — the same input produces the same output (deterministic)', () => {
    const input = inputFrom(villageCScenario());
    const first = planRecovery(input);
    const second = planRecovery(input);

    expect(second).toEqual(first);
    expect(second.proposals.map((proposal) => proposal.requestId)).toEqual(
      first.proposals.map((proposal) => proposal.requestId),
    );
  });

  it('K — exam-day students are prioritised for every available seat', () => {
    const students = makeStudents(17).map((student, index) => ({
      ...student,
      isExamDay: index < 10,
    }));
    const incident = makeIncident('INC-EXAM-CRISIS', 'BUS-B2');
    const requests = students.map((student, index) =>
      makeRequest(
        `REQ-${String(index + 1).padStart(3, '0')}`,
        student.id,
        incident.id,
      ),
    );

    const plan = planRecovery({
      villages: [VILLAGE_A, VILLAGE_B, VILLAGE_C],
      students,
      vehicles: [busB2(), vanV1()],
      incidents: [incident],
      requests,
      assignments: [],
    });

    expect(plan.affectedCount).toBe(17);
    expect(plan.examStudentCount).toBe(10);
    expect(plan.proposals).toHaveLength(8);
    expect(plan.proposals.every((proposal) => proposal.isExamDay)).toBe(true);
    expect(plan.unserved).toHaveLength(9);
  });

  it('L — a flooded corridor is route_blocked and offers the configured relay', () => {
    const student = makeStudent('STU-001', VILLAGE_C.id, { isExamDay: true });
    const incident = makeIncident('INC-FLOOD', 'BUS-B2', {
      type: 'road_block',
      affectedVillageIds: [VILLAGE_C.id],
    });

    const plan = planRecovery({
      villages: [VILLAGE_A, VILLAGE_B, VILLAGE_C],
      students: [student],
      vehicles: [
        busB2({ status: 'cancelled' }),
        vanV1({ blockedCorridorIds: ['CRD-SOUTH'] }),
      ],
      incidents: [incident],
      requests: [makeRequest('REQ-F1', student.id, incident.id, { isExamDay: true })],
      assignments: [],
      relayRoutes: [
        {
          id: 'RLY-C-B',
          sourceVillageId: VILLAGE_C.id,
          junctionVillageId: VILLAGE_B.id,
          junctionName: VILLAGE_B.name,
          connectingTransportId: 'BUS-B1',
          connectingLabel: 'Bus B1 — Village A & B Express',
          connectingVerified: true,
          connectingStatus: 'active',
          walkDistanceKm: 1.5,
          corridorId: 'CRD-SOUTH',
        },
      ],
    });

    expect(plan.proposals).toHaveLength(0);
    expect(plan.unserved).toHaveLength(1);
    expect(plan.unserved[0].reason).toBe('route_blocked');
    expect(plan.unserved[0].relayAlternative).toContain('Village B');
  });
});

