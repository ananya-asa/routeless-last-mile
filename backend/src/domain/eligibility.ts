// eligibility.ts — Check if a transport option is eligible for a student's request
export interface CheckEligibilityParams {
  studentVillageId: string;
  classStartMin: number; // e.g. 540 (09:00)
  isExamDay: boolean;    // Exam day has 0 grace period tolerance
  transport: {
    id: string;
    status: string;
    verified: boolean;
    arrivalMin: number;
    villageIds: string[];
    capacity: number;
    occupiedSeats: number;
    accessible: boolean;
    blockedCorridors?: string[];
  };
  corridorId?: string;
  existingConfirmedAllocations: number;
}

export function isTransportEligible(params: CheckEligibilityParams): { eligible: boolean; reason?: string } {
  const { studentVillageId, classStartMin, isExamDay, transport, corridorId, existingConfirmedAllocations } = params;

  if (!transport.verified) {
    return { eligible: false, reason: 'no_verified_vehicle' };
  }

  if (transport.status !== 'active') {
    return { eligible: false, reason: 'vehicle_not_active' };
  }

  // Check road blockage / flooded corridors
  if (corridorId && transport.blockedCorridors && transport.blockedCorridors.includes(corridorId)) {
    return { eligible: false, reason: 'route_blocked' };
  }

  if (!transport.villageIds.includes(studentVillageId)) {
    return { eligible: false, reason: 'incompatible_route' };
  }

  // Arrival must be before class start (09:00 / 540). Zero grace on exam day.
  const graceMinutes = isExamDay ? 0 : 10;
  if (transport.arrivalMin > (classStartMin + graceMinutes)) {
    return { eligible: false, reason: 'too_late' };
  }

  const availableSeats = transport.capacity - transport.occupiedSeats - existingConfirmedAllocations;
  if (availableSeats <= 0) {
    return { eligible: false, reason: 'no_capacity' };
  }

  return { eligible: true };
}
