// ============================================================
// client.ts — Person 3 student API boundary.
//
// Every network call made by the student experience lives here. The coordinator
// track may reuse these functions, so existing names and return shapes are kept.
// Backend routes are the Hono routes owned by Person 2.
// ============================================================

import type {
  DashboardMetrics,
  HelpRequest,
  Incident,
  IncidentType,
  RecoveryProposal,
  RecoveryResult,
  TransportOption,
  Village,
} from '../data/types';

const configuredBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000').trim();
export const API_BASE = configuredBase.replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Request failed with ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const payload = await request<{ data: T } | T>(path, init);
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

// ── Health / bootstrap ───────────────────────────────────────

/**
 * Quick reachability probe used to decide between live backend mode and the
 * clearly labelled local student preview. Never throws.
 */
export async function checkBackendHealth(timeoutMs = 1800): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchVillages(): Promise<Village[]> {
  return requestEnvelope<Village[]>('/api/villages');
}

export async function fetchTransport(): Promise<TransportOption[]> {
  return requestEnvelope<TransportOption[]>('/api/transport');
}

export async function fetchIncidents(): Promise<Incident[]> {
  return requestEnvelope<Incident[]>('/api/incidents');
}

// ── Incidents (student reports a signal) ─────────────────────

export interface ReportIncidentInput {
  transportOptionId: string;
  type: IncidentType;
  reportedBy: 'student' | 'coordinator';
  affectedVillageIds: string[];
  details?: string;
}

export interface CreatedIncident {
  success: boolean;
  id: string;
}

export async function reportIncident(data: ReportIncidentInput): Promise<CreatedIncident> {
  return request<CreatedIncident>('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateIncidentStatus(
  id: string,
  status: 'confirmed' | 'dismissed',
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── Student requests ─────────────────────────────────────────

export async function fetchHelpRequests(): Promise<HelpRequest[]> {
  return requestEnvelope<HelpRequest[]>('/api/requests');
}

export interface CreatedRequest {
  success: boolean;
  id: string;
}

export async function createHelpRequest(
  studentId: string,
  incidentId: string,
): Promise<CreatedRequest> {
  return request<CreatedRequest>('/api/requests', {
    method: 'POST',
    body: JSON.stringify({ studentId, incidentId }),
  });
}

/**
 * The backend uses PATCH for escalation. Returns the updated legacy shape.
 */
export async function escalateHelpRequest(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/requests/${id}/escalate`, {
    method: 'PATCH',
  });
}

/** Latest request belonging to one pseudonymous student, if any. */
export function latestRequestForStudent(
  requests: HelpRequest[],
  studentId: string,
): HelpRequest | null {
  const mine = requests
    .filter((requestItem) => requestItem.student_id === studentId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return mine[0] ?? null;
}

// ── Recovery (coordinator calls, kept here for Person 4) ─────

export async function runRecoveryAnalysis(): Promise<RecoveryResult> {
  return request<RecoveryResult>('/api/recovery/run', { method: 'POST' });
}

export async function approveRecoveryPlan(
  proposals: RecoveryProposal[],
): Promise<{ success: boolean; count: number }> {
  return request<{ success: boolean; count: number }>('/api/recovery/approve', {
    method: 'POST',
    body: JSON.stringify({ proposals }),
  });
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return request<DashboardMetrics>('/api/metrics');
}

export async function resetScenario(scenarioId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/scenarios/reset/${scenarioId}`, {
    method: 'POST',
  });
}
