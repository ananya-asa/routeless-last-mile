// ============================================================
// eligibility.ts — Pure safety gate for a single recovery seat.
// No database imports: this is unit-testable and deterministic.
// ============================================================

export interface EligibilityTransport {
  id: string;
  label?: string;
  status: 'active' | 'delayed' | 'cancelled' | string;
  verified: boolean;
  arrivalMin: number;
  capacity: number;
  occupiedSeats: number;
  accessible: boolean;
  villageIds: string[];
  blockedCorridorIds?: string[];
}

export interface EligibilityStudent {
  villageId: string;
  corridorId: string;
  classStartMin: number;
  needsAccessibleVehicle: boolean;
}

export interface CheckEligibilityParams {
  student: EligibilityStudent;
  transport: EligibilityTransport;
  /** Confirmed seats already consumed by recovery assignments. */
  existingConfirmedAllocations: number;
  /** Transport ids targeted by a confirmed disruption. */
  disruptedTransportIds?: ReadonlySet<string>;
  /** Corridors blocked by the active scenario/incident. */
  blockedCorridorIds?: ReadonlySet<string>;
}

export type EligibilityReason =
  | 'no_verified_vehicle'
  | 'vehicle_not_active'
  | 'vehicle_disrupted'
  | 'incompatible_route'
  | 'blocked_corridor'
  | 'needs_accessible_vehicle'
  | 'too_late'
  | 'no_capacity';

export interface EligibilityResult {
  eligible: boolean;
  reason?: EligibilityReason;
  availableSeats: number;
  explanation?: string;
}

/**
 * A vehicle is eligible only if every safety and feasibility invariant holds:
 * verified → active → not disrupted → serves the village → corridor is open →
 * accessibility match → arrives before the class deadline → a seat remains.
 */
export function isTransportEligible(params: CheckEligibilityParams): EligibilityResult {
  const {
    student,
    transport,
    existingConfirmedAllocations,
    disruptedTransportIds,
    blockedCorridorIds,
  } = params;

  const availableSeats =
    transport.capacity - transport.occupiedSeats - existingConfirmedAllocations;

  if (!transport.verified) {
    return {
      eligible: false,
      reason: 'no_verified_vehicle',
      availableSeats,
      explanation: `${transport.label ?? transport.id} is not a verified institution vehicle.`,
    };
  }

  if (transport.status !== 'active') {
    return {
      eligible: false,
      reason: 'vehicle_not_active',
      availableSeats,
      explanation: `${transport.label ?? transport.id} is ${transport.status} and cannot be promised.`,
    };
  }

  if (disruptedTransportIds?.has(transport.id)) {
    return {
      eligible: false,
      reason: 'vehicle_disrupted',
      availableSeats,
      explanation: `${transport.label ?? transport.id} is part of a confirmed disruption.`,
    };
  }

  if (!transport.villageIds.includes(student.villageId)) {
    return {
      eligible: false,
      reason: 'incompatible_route',
      availableSeats,
      explanation: `${transport.label ?? transport.id} does not serve ${student.villageId}.`,
    };
  }

  const blocked =
    transport.blockedCorridorIds?.includes(student.corridorId) ||
    blockedCorridorIds?.has(student.corridorId);
  if (blocked) {
    return {
      eligible: false,
      reason: 'blocked_corridor',
      availableSeats,
      explanation: `The ${student.corridorId} corridor is blocked for ${transport.label ?? transport.id}.`,
    };
  }

  if (student.needsAccessibleVehicle && !transport.accessible) {
    return {
      eligible: false,
      reason: 'needs_accessible_vehicle',
      availableSeats,
      explanation: `${transport.label ?? transport.id} is not step-free accessible.`,
    };
  }

  // Zero grace: arrival must be at or before the class deadline.
  if (transport.arrivalMin > student.classStartMin) {
    return {
      eligible: false,
      reason: 'too_late',
      availableSeats,
      explanation: `${transport.label ?? transport.id} arrives after the class deadline.`,
    };
  }

  if (availableSeats <= 0) {
    return {
      eligible: false,
      reason: 'no_capacity',
      availableSeats,
      explanation: `${transport.label ?? transport.id} has no verified seat left.`,
    };
  }

  return { eligible: true, availableSeats };
}
