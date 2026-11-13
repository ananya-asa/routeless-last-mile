/**
 * ROUTELESS — backend eligibility rules (Person 2).
 * Pure TypeScript: no DB, no Hono, no React.
 */

export type VehicleStatus = 'active' | 'delayed' | 'cancelled';

export type UnservedReason =
  | 'no_verified_vehicle'
  | 'incompatible_route'
  | 'route_blocked'
  | 'too_late'
  | 'no_capacity';

export interface EligibilityStudent {
  id: string;
  villageId: string;
  /** Minutes after midnight. 09:00 = 540. */
  classStartMin: number;
  isExamDay: boolean;
  needsAccessibleVehicle?: boolean;
}

export interface EligibilityVillage {
  id: string;
  name: string;
  corridorId: string;
}

export interface EligibilityVehicle {
  id: string;
  label: string;
  verified: boolean;
  status: VehicleStatus;
  villageIds: string[];
  accessible: boolean;
  capacity: number;
  occupiedSeats: number;
  /** Estimated arrival at the college, minutes after midnight. */
  arrivalMin: number;
  blockedCorridorIds: string[];
}

export interface EligibilityCheck {
  rule: string;
  passed: boolean;
  detail: string;
  reason: UnservedReason;
}

export interface EligibilityInput {
  student: EligibilityStudent;
  village: EligibilityVillage;
  vehicle: EligibilityVehicle;
  /** capacity − occupiedSeats − confirmed assignments − draft seats used. */
  availableSeats: number;
  /** Vehicles named by a confirmed incident cannot rescue. */
  disruptedVehicleIds?: ReadonlySet<string>;
  /** Corridors closed by a confirmed road-block incident. */
  closedCorridorIds?: ReadonlySet<string>;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: UnservedReason;
  explanation: string;
  checks: EligibilityCheck[];
}

const REASON_PRIORITY: UnservedReason[] = [
  'route_blocked',
  'no_capacity',
  'too_late',
  'incompatible_route',
  'no_verified_vehicle',
];

export function bestUnservedReason(
  reasons: ReadonlyArray<UnservedReason | undefined>,
): UnservedReason {
  const present = new Set(reasons.filter((reason): reason is UnservedReason => Boolean(reason)));
  return REASON_PRIORITY.find((reason) => present.has(reason)) ?? 'no_verified_vehicle';
}

/**
 * One vehicle, one student, all spec §7 rules.
 * The first failed check becomes the unserved reason.
 */
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const { student, village, vehicle, availableSeats, disruptedVehicleIds, closedCorridorIds } = input;

  const checks: EligibilityCheck[] = [];
  const check = (
    rule: string,
    passed: boolean,
    detail: string,
    reason: UnservedReason,
  ): void => {
    checks.push({ rule, passed, detail, reason });
  };

  const disrupted = disruptedVehicleIds?.has(vehicle.id) ?? false;
  const servesVillage = vehicle.villageIds.includes(student.villageId);
  const corridorClosed =
    (closedCorridorIds?.has(village.corridorId) ?? false) ||
    vehicle.blockedCorridorIds.includes(village.corridorId);
  const accessibleOk = !student.needsAccessibleVehicle || vehicle.accessible;
  // Normal days allow a 10-minute arrival grace; exam days allow none.
  const graceMinutes = student.isExamDay ? 0 : 10;
  const deadlineMin = student.classStartMin + graceMinutes;
  const onTime = vehicle.arrivalMin <= deadlineMin;
  const graceNote = student.isExamDay
    ? ' Exam day: zero grace.'
    : ` Includes the ${graceMinutes}-minute grace window.`;

  check(
    'Verified vehicle',
    vehicle.verified,
    vehicle.verified
      ? `${vehicle.label} is institution-verified.`
      : `${vehicle.label} is unverified and can never carry students.`,
    'no_verified_vehicle',
  );

  check(
    'Vehicle available',
    vehicle.status !== 'cancelled' && !disrupted,
    disrupted
      ? `${vehicle.label} is named in a confirmed disruption incident.`
      : vehicle.status === 'cancelled'
        ? `${vehicle.label} is cancelled.`
        : `${vehicle.label} is ${vehicle.status}.`,
    'no_verified_vehicle',
  );

  check(
    'Serves village',
    servesVillage,
    servesVillage
      ? `${vehicle.label} covers ${village.name}.`
      : `${vehicle.label} does not serve ${village.name}.`,
    'incompatible_route',
  );

  check(
    'Accessible vehicle',
    accessibleOk,
    accessibleOk
      ? vehicle.accessible
        ? `${vehicle.label} has step-free access.`
        : 'Student does not require step-free access.'
      : `${vehicle.label} is not accessible and the student requires it.`,
    'incompatible_route',
  );

  check(
    'Corridor open',
    !corridorClosed,
    corridorClosed
      ? `The corridor serving ${village.name} is blocked.`
      : `The corridor serving ${village.name} is open.`,
    'route_blocked',
  );

  check(
    'Arrives by class start',
    onTime,
    onTime
      ? `${vehicle.label} arrives at ${formatClock(vehicle.arrivalMin)}, by the ${formatClock(deadlineMin)} deadline.${graceNote}`
      : `${vehicle.label} arrives at ${formatClock(vehicle.arrivalMin)}, after the ${formatClock(deadlineMin)} deadline.${graceNote}`,
    'too_late',
  );

  check(
    'Seat available',
    availableSeats > 0,
    availableSeats > 0
      ? `${availableSeats} seat(s) free on ${vehicle.label}.`
      : `${vehicle.label} has no free seats.`,
    'no_capacity',
  );

  const firstFailure = checks.find((item) => !item.passed);

  return {
    eligible: !firstFailure,
    reason: firstFailure?.reason,
    explanation:
      firstFailure?.detail ??
      `${vehicle.label} is verified, serves ${village.name}, has a free seat, and arrives by ${formatClock(deadlineMin)}.`,
    checks,
  };
}

function formatClock(minutes: number): string {
  const safe = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
