// client.ts — Fetch helpers to backend API
import { Village, TransportOption, Incident, HelpRequest, RecoveryResult, DashboardMetrics } from '../data/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchVillages(): Promise<Village[]> {
  const res = await fetch(`${API_BASE}/api/villages`);
  const json = await res.json();
  return json.data;
}

export async function fetchTransport(): Promise<TransportOption[]> {
  const res = await fetch(`${API_BASE}/api/transport`);
  const json = await res.json();
  return json.data;
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/api/incidents`);
  const json = await res.json();
  return json.data;
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

export async function fetchHelpRequests(): Promise<HelpRequest[]> {
  const res = await fetch(`${API_BASE}/api/requests`);
  const json = await res.json();
  return json.data;
}

export async function createHelpRequest(studentId: string, incidentId: string) {
  const res = await fetch(`${API_BASE}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, incidentId }),
  });
  return res.json();
}

export async function runRecoveryAnalysis(): Promise<RecoveryResult> {
  const res = await fetch(`${API_BASE}/api/recovery/run`, { method: 'POST' });
  return res.json();
}

export async function approveRecoveryPlan(proposals: any[]) {
  const res = await fetch(`${API_BASE}/api/recovery/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposals }),
  });
  return res.json();
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/api/metrics`);
  return res.json();
}

export async function resetScenario(scenarioId: string) {
  const res = await fetch(`${API_BASE}/api/scenarios/reset/${scenarioId}`, { method: 'POST' });
  return res.json();
}

