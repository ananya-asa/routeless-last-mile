// ============================================================
// Person 3 local preview fixtures and presentation helpers.
//
// These mirror the committed backend seed (ids and minutes) so the student UI
// degrades gracefully when the API is unavailable. They are never used to claim
// live state: StudentHome labels this mode clearly and only Person 1/2 own real data.
// ============================================================

import type {
  CrowdingLevel,
  HelpRequest,
  Incident,
  IncidentType,
  RecoveryProposal,
  TransportOption,
  Village,
} from '../../data/types';

export const STUDENT_ID = 'STU-001';
export const DEMO_CLASS_START_MIN = 9 * 60;
export const DEMO_REQUEST_ID = 'REQ-DEMO-001';
export const DEMO_PENDING_REPORTS = 12;

export type StudentStage =
  | 'idle'
  | 'reported'
  | 'verified'
  | 'proposed'
  | 'confirmed'
  | 'unserved'
  | 'escalated';

export interface Institution {
  id: string;
  name: string;
}

export const institutions: Institution[] = [
  { id: 'demo-district', name: 'Demo District College' },
  { id: 'hunsur-pu', name: 'Govt. PU College, Hunsur' },
];

export const demoVillages: Village[] = [
  { id: 'VLG-A', name: 'Village A', corridor_id: 'CRD-NORTH' },
  { id: 'VLG-B', name: 'Village B', corridor_id: 'CRD-NORTH' },
  { id: 'VLG-C', name: 'Village C', corridor_id: 'CRD-SOUTH' },
];

export const demoTransports: TransportOption[] = [
  {
    id: 'BUS-B1',
    label: 'Bus B1 — Village A & B Express',
    kind: 'government_bus',
    status: 'active',
    verified: true,
    capacity: 40,
    occupied_seats: 15,
    departure_min: 7 * 60,
    arrival_min: 8 * 60 + 45,
    accessible: false,
    driver_name: 'Ramesh Kumar',
    villageIds: ['VLG-A', 'VLG-B'],
  },
  {
    id: 'BUS-B2',
    label: 'Bus B2 — Village C Direct',
    kind: 'government_bus',
    status: 'active',
    verified: true,
    capacity: 40,
    occupied_seats: 0,
    departure_min: 7 * 60 + 30,
    arrival_min: 8 * 60 + 50,
    accessible: false,
    driver_name: 'Sunil Singh',
    villageIds: ['VLG-C'],
  },
  {
    id: 'VAN-V1',
    label: 'Van V1 — School Backup',
    kind: 'institution_vehicle',
    status: 'active',
    verified: true,
    capacity: 10,
    occupied_seats: 2,
    departure_min: 7 * 60 + 45,
    arrival_min: 8 * 60 + 55,
    accessible: true,
    driver_name: 'Arvind Mehra',
    villageIds: ['VLG-C'],
  },
];

export const demoIncidents: Incident[] = [
  {
    id: 'INC-B2-BREAKDOWN',
    transport_option_id: 'BUS-B2',
    type: 'breakdown',
    status: 'reported',
    reported_by: 'student',
    details: 'Bus B2 has not arrived at the stop. Demo scenario.',
    created_at: new Date().toISOString(),
    affectedVillageIds: ['VLG-C'],
  },
];

export function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return DEMO_CLASS_START_MIN;
  }
  return Math.max(0, Math.min(23 * 60 + 59, hours * 60 + minutes));
}

export function busForVillage(
  transports: TransportOption[],
  villageId: string,
): TransportOption | null {
  return (
    transports.find(
      (transport) =>
        transport.kind === 'government_bus' && transport.villageIds.includes(villageId),
    ) ?? null
  );
}

export function backupForVillage(
  transports: TransportOption[],
  villageId: string,
): TransportOption | null {
  return (
    transports.find(
      (transport) =>
        transport.kind === 'institution_vehicle' &&
        transport.verified &&
        transport.status === 'active' &&
        transport.villageIds.includes(villageId),
    ) ?? null
  );
}

export function activeIncidentForTransport(
  incidents: Incident[],
  transportId: string | undefined,
): Incident | null {
  if (!transportId) return null;
  const matches = incidents.filter(
    (incident) => incident.transport_option_id === transportId && incident.status !== 'dismissed',
  );
  return (
    matches.find((incident) => incident.status === 'confirmed') ??
    matches.find((incident) => incident.status === 'reported') ??
    null
  );
}

/** Backend request status + incident status → the student lifecycle step. */
export function stageFromLive(
  request: HelpRequest | null,
  incident: Incident | null,
): StudentStage {
  if (!request) return 'idle';
  if (request.status === 'confirmed') return 'confirmed';
  if (request.status === 'proposed') return 'proposed';
  if (request.status === 'unserved') return 'unserved';
  if (request.status === 'escalated') return 'escalated';
  if (request.status === 'pending') {
    return incident?.status === 'confirmed' ? 'verified' : 'reported';
  }
  return 'idle';
}

/** Deterministic Kannada/English keyword assist. No model, no network. */
const ISSUE_PATTERNS: Array<{ type: IncidentType; pattern: RegExp }> = [
  {
    type: 'road_block',
    pattern: /(road\s*block|raste|ರಸ್ತೆ|block(ed)?|ಬ್ಲಾಕ್|bandh|ಬಂದ್)/i,
  },
  {
    type: 'breakdown',
    pattern: /(break\s*down|breakdown|kett|ಕೆಟ್ಟ|mechanic|repair|ಗುಣಪಡಿಸ)/i,
  },
  {
    type: 'full',
    pattern: /(full|thumba|thumbaa|ತುಂಬ|seat\s*illa|ಸೀಟ್\s*ಇಲ್ಲ|no\s*seat)/i,
  },
  {
    type: 'delay',
    pattern: /(delay|late|tade|ತಡ|time\s*agalla)/i,
  },
  {
    type: 'no_show',
    pattern: /(no\s*bus|bus\s*illa|absent|ಬಸ್\s*ಇಲ್ಲ|baruthilla|ಬರುತ್ತಿಲ್ಲ|no\s*show)/i,
  },
];

export function detectIssue(text: string): IncidentType | null {
  const normalized = text.trim();
  if (!normalized) return null;
  for (const candidate of ISSUE_PATTERNS) {
    if (candidate.pattern.test(normalized)) return candidate.type;
  }
  return null;
}

export function getCrowding(
  pendingReports: number,
  availableSeats: number,
): { level: CrowdingLevel; ratio: number } {
  if (availableSeats <= 0) return { level: 'red', ratio: 1 };
  const ratio = pendingReports / availableSeats;
  if (ratio > 1) return { level: 'red', ratio };
  if (ratio > 0.6) return { level: 'amber', ratio };
  return { level: 'green', ratio };
}

export function buildDemoProposal(transport: TransportOption): RecoveryProposal {
  return {
    requestId: DEMO_REQUEST_ID,
    studentId: STUDENT_ID,
    transportOptionId: transport.id,
    transportLabel: transport.label,
    explanation: `${transport.label} is verified for Village C, has free seats, and is estimated to arrive at ${formatTime(transport.arrival_min)} — before the 09:00 class deadline.`,
  };
}

export function buildUnservedExplanation(transport: TransportOption | null): string {
  if (!transport) {
    return 'No verified recovery vehicle serves Village C in this fixture. No seat can be promised without inventing a ride.';
  }
  const freeSeats = transport.capacity - transport.occupied_seats;
  if (freeSeats <= 0) {
    return `Every verified seat on ${transport.label} is already allocated. Waiting list preserved; no overbooking.`;
  }
  if (transport.arrival_min > DEMO_CLASS_START_MIN) {
    return `${transport.label} arrives at ${formatTime(transport.arrival_min)}, after the 09:00 deadline. We will not promise an on-time seat.`;
  }
  return 'No verified vehicle meets every safety constraint for this trip.';
}
