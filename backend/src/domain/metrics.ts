/**
 * ROUTELESS — dashboard metrics (Person 2).
 * Everything is derived from canonical rows; never stored by hand.
 */

import type {
  EngineAssignment,
  EngineIncident,
  EngineRequest,
  EngineVehicle,
} from './recoveryEngine.js';
import { confirmedAssignments, getDisruptedVehicleIds, seatUsageFor } from './recoveryEngine.js';

export interface MetricsInput {
  vehicles: EngineVehicle[];
  incidents: EngineIncident[];
  requests: EngineRequest[];
  assignments?: EngineAssignment[];
}

export interface DashboardMetrics {
  confirmedIncidents: number;
  reportedIncidents: number;
  affectedRequests: number;
  confirmedPlacements: number;
  unserved: number;
  freeSeats: number;
  seatUsage: Record<string, number>;
}

export function computeMetrics(input: MetricsInput): DashboardMetrics {
  const assignments = input.assignments ?? [];
  const confirmed = confirmedAssignments(assignments);
  const confirmedRequestIds = new Set(confirmed.map((assignment) => assignment.requestId));

  const confirmedIncidentIds = new Set(
    input.incidents
      .filter((incident) => incident.status === 'confirmed')
      .map((incident) => incident.id),
  );

  const affectedStudentIds = new Set<string>();
  for (const request of input.requests) {
    if (confirmedIncidentIds.has(request.incidentId)) {
      affectedStudentIds.add(request.studentId);
    }
  }
  const affectedRequests = affectedStudentIds.size;

  const seatUsage: Record<string, number> = {};
  for (const vehicle of input.vehicles) {
    seatUsage[vehicle.id] = seatUsageFor(vehicle, assignments);
  }

  const disrupted = getDisruptedVehicleIds(input.incidents);
  const freeSeats = input.vehicles.reduce((total, vehicle) => {
    if (!vehicle.verified || vehicle.status === 'cancelled' || disrupted.has(vehicle.id)) {
      return total;
    }
    return total + Math.max(0, vehicle.capacity - seatUsage[vehicle.id]);
  }, 0);

  return {
    confirmedIncidents: confirmedIncidentIds.size,
    reportedIncidents: input.incidents.filter((incident) => incident.status === 'reported').length,
    affectedRequests,
    confirmedPlacements: confirmedRequestIds.size,
    unserved: Math.max(0, affectedRequests - confirmedRequestIds.size),
    freeSeats,
    seatUsage,
  };
}
