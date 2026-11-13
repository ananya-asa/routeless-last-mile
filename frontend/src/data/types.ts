export type IncidentStatus = 'reported' | 'confirmed' | 'dismissed';
export type VehicleStatus = 'active' | 'delayed' | 'cancelled';
export type RequestStatus = 'pending' | 'proposed' | 'confirmed' | 'unserved' | 'escalated';
export type IncidentType = 'no_show' | 'full' | 'breakdown' | 'delay' | 'road_block';

export type UnservedReason =
  | 'no_verified_vehicle'
  | 'incompatible_route'
  | 'too_late'
  | 'no_capacity';

export type CrowdingLevel = 'green' | 'amber' | 'red';

export interface Village {
  id: string;
  name: string;
  corridor_id: string;
}

export interface TransportOption {
  id: string;
  label: string;
  kind: 'government_bus' | 'institution_vehicle';
  status: VehicleStatus;
  verified: boolean;
  capacity: number;
  occupied_seats: number;
  departure_min: number;
  arrival_min: number;
  accessible: boolean;
  driver_name?: string;
  contact?: string;
  villageIds: string[];
  blockedCorridorIds?: string[];
  /** Computed client-side from confirmed requests for the coordinator board. */
  confirmedAssignments?: number;
  freeSeats?: number;
}

export interface Incident {
  id: string;
  transport_option_id: string;
  type: IncidentType;
  status: IncidentStatus;
  reported_by: 'student' | 'coordinator';
  details?: string;
  created_at: string;
  affectedVillageIds: string[];
  /** Presentation-only enrichment added by the coordinator client. */
  transportLabel?: string;
  requestCount?: number;
}

export interface HelpRequest {
  id: string;
  student_id: string;
  incident_id: string;
  status: RequestStatus;
  created_at: string;
  isExamDay?: boolean;
  assignedOptionId?: string;
  assignmentLabel?: string;
}

export interface Assignment {
  id: string;
  request_id: string;
  transport_option_id: string;
  status: 'proposed' | 'confirmed' | 'cancelled';
  explanation?: string;
  created_at: string;
}

export interface RecoveryProposal {
  requestId: string;
  studentId: string;
  transportOptionId: string;
  transportLabel: string;
  explanation: string;
  id?: string;
  status?: 'proposed' | 'confirmed';
  isExamDay?: boolean;
  arrivalMin?: number;
}

export interface UnservedStudent {
  requestId: string;
  studentId: string;
  reason: string;
  explanation: string;
}

export interface RecoveryResult {
  affectedCount: number;
  proposedCount: number;
  unservedCount: number;
  proposals: RecoveryProposal[];
  unserved: UnservedStudent[];
  id?: string;
  status?: 'draft' | 'approved';
  engineNote?: string;
  examStudentCount?: number;
  createdAtMin?: number;
}

export interface DashboardMetrics {
  confirmedIncidents: number;
  reportedIncidents: number;
  affectedRequests: number;
  confirmedPlacements: number;
  unserved: number;
  affected?: number;
  examStudents?: number;
  eligibleProposals?: number;
  freeSeats?: number;
  verifiedVehicles?: number;
  unverifiedVehicles?: number;
  seatUsage?: Record<string, number>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
}
