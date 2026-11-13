// client.ts — Fetch helpers to backend API with Sarvam AI Indic triage support.
// All mapping from backend camelCase → frontend snake_case types is done here.

import type { Village, TransportOption, Incident, HelpRequest, RecoveryResult, DashboardMetrics } from '../data/types';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Villages ─────────────────────────────────────────────────
// Backend returns: { id, name, corridorId }
// Frontend type:   { id, name, corridor_id }
export async function fetchVillages(): Promise<Village[]> {
  const res = await fetch(`${API_BASE}/api/villages`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data ?? []).map((v: any): Village => ({
    id: v.id,
    name: v.name,
    corridor_id: v.corridorId ?? v.corridor_id,
  }));
}

// ── Transport ─────────────────────────────────────────────────
// Backend returns: { id, label, kind('school_van'|'government_bus'), status, verified,
//                   capacity, occupiedSeats, departureMin, arrivalMinByVillage{}, accessible, villageIds }
// Frontend type:   { id, label, kind('institution_vehicle'|'government_bus'), status, verified,
//                   capacity, occupied_seats, departure_min, arrival_min, accessible, villageIds }
export async function fetchTransport(): Promise<TransportOption[]> {
  const res = await fetch(`${API_BASE}/api/transport`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data ?? []).map((t: any): TransportOption => {
    // Derive single arrival_min: take first value from arrivalMinByVillage or fallback field
    const arrivalMin: number =
      t.arrivalMinByVillage && Object.keys(t.arrivalMinByVillage).length > 0
        ? Object.values(t.arrivalMinByVillage)[0] as number
        : (t.arrival_min ?? 0);

    return {
      id: t.id,
      label: t.label,
      // Backend returns 'school_van'; frontend type uses 'institution_vehicle'
      kind: t.kind === 'school_van' ? 'institution_vehicle' : t.kind,
      status: t.status,
      verified: t.verified,
      capacity: t.capacity,
      occupied_seats: t.occupiedSeats ?? t.occupied_seats ?? 0,
      departure_min: t.departureMin ?? t.departure_min ?? 0,
      arrival_min: arrivalMin,
      accessible: t.accessible,
      driver_name: t.driverName ?? t.driver_name,
      contact: t.contact,
      villageIds: t.villageIds ?? [],
    };
  });
}

// ── Incidents ─────────────────────────────────────────────────
// Backend returns: { id, transportOptionId, type, status, reportedBy, affectedVillageIds, details, reportedAtMin }
// Frontend type:   { id, transport_option_id, type, status, reported_by, affectedVillageIds, details, created_at }
export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/api/incidents`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data ?? []).map((inc: any): Incident => ({
    id: inc.id,
    transport_option_id: inc.transportOptionId ?? inc.transport_option_id,
    type: inc.type,
    status: inc.status,
    reported_by: inc.reportedBy ?? inc.reported_by,
    details: inc.details,
    created_at: inc.created_at ?? new Date().toISOString(),
    affectedVillageIds: inc.affectedVillageIds ?? [],
  }));
}

export async function reportIncident(data: {
  transportOptionId: string;
  type: string;
  reportedBy: string;
  affectedVillageIds: string[];
  details?: string;
}) {
  const res = await fetch(`${API_BASE}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateIncidentStatus(id: string, status: 'confirmed' | 'dismissed') {
  const res = await fetch(`${API_BASE}/api/incidents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

// ── Help Requests ─────────────────────────────────────────────
// Backend returns: { id, studentId, incidentId, status, isExamDay, assignedOptionId, createdAtMin }
// Frontend type:   { id, student_id, incident_id, status, created_at }
export async function fetchHelpRequests(): Promise<HelpRequest[]> {
  const res = await fetch(`${API_BASE}/api/requests`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data ?? []).map((r: any): HelpRequest => ({
    id: r.id,
    student_id: r.studentId ?? r.student_id,
    incident_id: r.incidentId ?? r.incident_id,
    status: r.status,
    created_at: r.created_at ?? new Date().toISOString(),
  }));
}

export async function createHelpRequest(studentId: string, incidentId: string) {
  const res = await fetch(`${API_BASE}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, incidentId }),
  });
  return res.json();
}

export async function escalateHelpRequest(requestId: string) {
  const res = await fetch(`${API_BASE}/api/requests/${requestId}/escalate`, {
    method: 'PATCH',
  });
  return res.json();
}

/** Pure helper — no network call. Returns most recent request for a student. */
export function latestRequestForStudent(requests: HelpRequest[], studentId: string): HelpRequest | undefined {
  return requests
    .filter(r => r.student_id === studentId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

// ── Recovery ──────────────────────────────────────────────────
export async function runRecoveryAnalysis(): Promise<RecoveryResult> {
  const res = await fetch(`${API_BASE}/api/recovery/run`, { method: 'POST' });
  return res.json();
}

export async function approveRecoveryPlan(proposals: unknown[]) {
  const res = await fetch(`${API_BASE}/api/recovery/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposals }),
  });
  return res.json();
}

// ── Metrics ───────────────────────────────────────────────────
// Backend returns: { affected, examStudents, eligibleProposals, confirmedPlacements, unserved, ... }
// Frontend type:   { confirmedIncidents, reportedIncidents, affectedRequests, confirmedPlacements, unserved }
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/api/metrics`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();
  return {
    confirmedIncidents: json.confirmedIncidents ?? 0,
    reportedIncidents: json.reportedIncidents ?? 0,
    affectedRequests: json.affected ?? json.affectedRequests ?? 0,
    confirmedPlacements: json.confirmedPlacements ?? 0,
    unserved: json.unserved ?? 0,
  };
}

// ── Scenarios ─────────────────────────────────────────────────
export async function resetScenario(scenarioId: string) {
  const res = await fetch(`${API_BASE}/api/scenarios/reset/${scenarioId}`, { method: 'POST' });
  return res.json();
}

// ── Sarvam AI Kannada Triage ──────────────────────────────────
export async function triageWithSarvam(text: string) {
  const res = await fetch(`${API_BASE}/api/triage/sarvam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return res.json();
}
