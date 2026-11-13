// ============================================================
// CoordinatorDashboard.tsx — Live coordinator control panel.
// Connects to backend: incidents, requests, recovery, metrics, SSE.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Users,
  Zap,
  XCircle,
  Bus,
  TrendingUp,
  Loader2,
  WifiOff,
  Wifi,
} from 'lucide-react';
import {
  fetchIncidents,
  fetchHelpRequests,
  fetchDashboardMetrics,
  updateIncidentStatus,
  runRecoveryAnalysis,
  approveRecoveryPlan,
  resetScenario,
} from '../api/client';
import { DemoBadge } from '../components/DemoBadge';
import { useSSE } from '../hooks/useSSE';
import type { Incident, HelpRequest, DashboardMetrics } from '../data/types';

interface RecoveryPlan {
  id: string;
  status: string;
  proposals: Array<{
    requestId: string;
    studentId: string;
    transportLabel: string;
    explanation: string;
    isExamDay?: boolean;
    arrivalMin?: number;
  }>;
  unserved: Array<{ requestId: string; studentId: string; reason: string; explanation: string }>;
  engineNote?: string;
  examStudentCount?: number;
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const CoordinatorDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningRecovery, setRunningRecovery] = useState(false);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const sseTimer = useRef<number | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = useCallback(async () => {
    try {
      const [inc, req, met] = await Promise.all([
        fetchIncidents(),
        fetchHelpRequests(),
        fetchDashboardMetrics(),
      ]);
      setIncidents(inc);
      setRequests(req);
      setMetrics(met);
    } catch {
      // silently keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // SSE: re-fetch on any backend event
  const handleSse = useCallback(() => {
    if (sseTimer.current !== null) window.clearTimeout(sseTimer.current);
    sseTimer.current = window.setTimeout(() => {
      sseTimer.current = null;
      loadAll();
    }, 400);
  }, [loadAll]);

  const { status: sseStatus } = useSSE(handleSse, { enabled: true });

  // ── Actions ──────────────────────────────────────────────────
  const confirmIncident = async (id: string) => {
    await updateIncidentStatus(id, 'confirmed');
    showToast('Incident confirmed — recovery engine notified');
    loadAll();
  };

  const dismissIncident = async (id: string) => {
    await updateIncidentStatus(id, 'dismissed');
    showToast('Incident dismissed');
    loadAll();
  };

  const runRecovery = async () => {
    setRunningRecovery(true);
    setPlan(null);
    try {
      const result = await runRecoveryAnalysis();
      setPlan(result as unknown as RecoveryPlan);
      showToast(`Recovery plan ready — ${(result as unknown as RecoveryPlan).proposals?.length ?? 0} proposals`);
    } catch {
      showToast('Recovery engine failed', false);
    } finally {
      setRunningRecovery(false);
    }
  };

  const approvePlan = async () => {
    if (!plan) return;
    setApprovingPlan(true);
    try {
      // Use raw plan proposals directly (they have transportOptionId from /api/recovery/run)
      const result = await approveRecoveryPlan(
        (plan as unknown as { proposals: unknown[] }).proposals
      );
      showToast(`Plan approved — ${(result as { count?: number }).count ?? 0} seats confirmed ✅`);
      setPlan(null);
      loadAll();
    } catch {
      showToast('Approval failed', false);
    } finally {
      setApprovingPlan(false);
    }
  };

  const resetDemo = async () => {
    setResetting(true);
    try {
      await resetScenario('SCN-DEFAULT');
      showToast('Demo reset to default scenario');
      setPlan(null);
      loadAll();
    } catch {
      showToast('Reset failed', false);
    } finally {
      setResetting(false);
    }
  };

  const runExamCrisis = async () => {
    setResetting(true);
    try {
      await resetScenario('SCN-EXAM-CRISIS');
      showToast('Exam Day Crisis loaded — 17 students, dual breakdown, flood 🚨');
      setPlan(null);
      loadAll();
    } catch {
      showToast('Scenario load failed', false);
    } finally {
      setResetting(false);
    }
  };

  const pendingIncidents = incidents.filter(i => i.status === 'reported');
  const confirmedIncidents = incidents.filter(i => i.status === 'confirmed');

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.ok ? 'bg-teal-700 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-teal-700" size={20} />
          <h2 className="text-lg font-bold text-stone-800">Coordinator Dashboard</h2>
          <DemoBadge />
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs font-medium ${
            sseStatus === 'open' ? 'text-teal-600' : 'text-stone-400'
          }`}>
            {sseStatus === 'open'
              ? <><Wifi size={12} /> Live</>
              : <><WifiOff size={12} /> Offline</>}
          </span>
          <button
            onClick={loadAll}
            className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-teal-700 hover:border-teal-300 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending Incidents', value: pendingIncidents.length, color: 'text-amber-600', icon: AlertTriangle },
            { label: 'Confirmed Incidents', value: confirmedIncidents.length, color: 'text-red-600', icon: XCircle },
            { label: 'Help Requests', value: requests.length, color: 'text-blue-600', icon: Users },
            { label: 'Confirmed Seats', value: metrics.confirmedPlacements, color: 'text-teal-600', icon: CheckCircle2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <div className={`flex items-center gap-2 ${color} mb-1`}>
                <Icon size={16} />
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <div className="text-2xl font-bold text-stone-800">{value}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-stone-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Loading…
        </div>
      )}

      {/* Scenario buttons */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-stone-700 text-sm flex items-center gap-2">
          <Zap size={15} className="text-amber-500" /> Demo Scenarios
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={resetDemo}
            disabled={resetting}
            className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {resetting ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
            Reset Default
          </button>
          <button
            onClick={runExamCrisis}
            disabled={resetting}
            className="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
          >
            🚨 Exam Day Crisis
          </button>
        </div>
        <p className="text-xs text-stone-400">Exam Crisis: 17 students · dual breakdown · flood · 2-tier exam priority</p>
      </div>

      {/* Pending Incidents */}
      {pendingIncidents.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-amber-700 text-sm flex items-center gap-2">
            <AlertTriangle size={15} /> Pending Incidents ({pendingIncidents.length})
          </h3>
          <div className="space-y-2">
            {pendingIncidents.map(inc => (
              <div key={inc.id} className="flex items-start justify-between gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Bus size={13} className="text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-stone-700 truncate">{inc.transport_option_id}</span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">{inc.type}</span>
                  </div>
                  {inc.details && <p className="text-xs text-stone-500 truncate">{inc.details}</p>}
                  <p className="text-xs text-stone-400">{inc.affectedVillageIds?.join(', ')}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => confirmIncident(inc.id)}
                    className="px-2 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => dismissIncident(inc.id)}
                    className="px-2 py-1 text-xs font-semibold bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed incidents */}
      {confirmedIncidents.length > 0 && (
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="font-semibold text-red-700 text-sm flex items-center gap-2">
            <XCircle size={15} /> Confirmed Disruptions ({confirmedIncidents.length})
          </h3>
          {confirmedIncidents.map(inc => (
            <div key={inc.id} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-xs">
              <span className="font-bold text-stone-700">{inc.transport_option_id}</span>
              <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{inc.type}</span>
              <span className="text-stone-400 ml-auto">{inc.affectedVillageIds?.join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recovery Engine */}
      <div className="bg-white border border-teal-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-teal-800 text-sm flex items-center gap-2">
            <TrendingUp size={15} /> Recovery Engine
          </h3>
          <button
            onClick={runRecovery}
            disabled={runningRecovery || confirmedIncidents.length === 0}
            className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {runningRecovery ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Run Recovery
          </button>
        </div>

        {confirmedIncidents.length === 0 && (
          <p className="text-xs text-stone-400">Confirm at least one incident to run the recovery engine.</p>
        )}

        {plan && (
          <div className="space-y-3">
            <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-2">{plan.engineNote}</div>

            {plan.proposals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-teal-700">Proposed Seats ({plan.proposals.length})</p>
                {plan.proposals.map((p, i) => (
                  <div key={i} className={`p-2.5 rounded-lg border text-xs ${
                    p.isExamDay ? 'bg-purple-50 border-purple-200' : 'bg-teal-50 border-teal-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {p.isExamDay && <span className="text-purple-600 font-bold">📋 EXAM</span>}
                      <span className="font-semibold text-stone-700">{p.studentId}</span>
                      <span className="text-stone-400">→</span>
                      <span className="text-teal-700 font-medium truncate">{p.transportLabel}</span>
                      {p.arrivalMin !== undefined && (
                        <span className="ml-auto text-stone-400 shrink-0">ETA {formatMin(p.arrivalMin)}</span>
                      )}
                    </div>
                    <p className="text-stone-500 text-xs">{p.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {plan.unserved.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-600">Unserved ({plan.unserved.length}) — honest seat math</p>
                {plan.unserved.map((u, i) => (
                  <div key={i} className="p-2 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
                    <span className="font-semibold">{u.studentId}</span>: {u.explanation}
                  </div>
                ))}
              </div>
            )}

            {plan.proposals.length > 0 && (
              <button
                onClick={approvePlan}
                disabled={approvingPlan}
                className="w-full py-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {approvingPlan ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve & Notify Students
              </button>
            )}
          </div>
        )}
      </div>

      {/* Help Requests */}
      {requests.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="font-semibold text-stone-700 text-sm flex items-center gap-2">
            <Users size={15} /> Help Requests ({requests.length})
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {requests.map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs">
                <span className="font-semibold text-stone-700">{r.student_id}</span>
                <span className={`px-1.5 py-0.5 rounded font-medium ${
                  r.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                  r.status === 'unserved' ? 'bg-red-100 text-red-700' :
                  r.status === 'escalated' ? 'bg-purple-100 text-purple-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{r.status}</span>
                <span className="text-stone-400 truncate">{r.incident_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
