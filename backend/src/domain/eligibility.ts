// eligibility.ts — Check if a transport option is eligible for a student's request
export interface CheckEligibilityParams {
  studentVillageId: string;
  classStartMin: number; // e.g. 540 (09:00)
  transport: {
    id: string;
    status: string;
    verified: boolean;
    arrivalMin: number;
    villageIds: string[];
    capacity: number;
    occupiedSeats: number;
    accessible: boolean;
  };
  existingConfirmedAllocations: number;
}

export function isTransportEligible(params: CheckEligibilityParams): { eligible: boolean; reason?: string } {
  const { studentVillageId, classStartMin, transport, existingConfirmedAllocations } = params;

  if (!transport.verified) {
    return { eligible: false, reason: 'no_verified_vehicle' };
  }

  if (transport.status !== 'active') {
    return { eligible: false, reason: 'vehicle_not_active' };
  }

  if (!transport.villageIds.includes(studentVillageId)) {
    return { eligible: false, reason: 'incompatible_route' };
  }

  // Arrival must be on or before class start (09:00 / 540)
  if (transport.arrivalMin > classStartMin) {
    return { eligible: false, reason: 'too_late' };
  }

  const availableSeats = transport.capacity - transport.occupiedSeats - existingConfirmedAllocations;
  if (availableSeats <= 0) {
    return { eligible: false, reason: 'no_capacity' };
  }

  return { eligible: true };
}

