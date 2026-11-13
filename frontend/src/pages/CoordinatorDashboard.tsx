// ============================================================
// CoordinatorDashboard.tsx — live recovery control room.
// Real API data only: incidents, vehicles, requests, metrics, SSE.
// ============================================================

import {
  AlertTriangle,
  ArrowRight,
  BusFront,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleSlash2,
  ClipboardCheck,
  Clock3,
  CloudRain,
  Gauge,
  Info,
  LifeBuoy,
  Loader2,
  Megaphone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  approveRecoveryPlan,
  fetchDashboardMetrics,
  fetchHelpRequests,
  fetchIncidents,
  fetchTransport,
  fetchVillages,
  resetScenario,
  runRecoveryAnalysis,
  updateIncidentStatus,
  updateTransport,
} from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { IncidentCard } from '../components/IncidentCard';
import { Modal } from '../components/Modal';
import { StatusChip } from '../components/StatusChip';
import { VehicleCard } from '../components/VehicleCard';
import { useSSE } from '../hooks/useSSE';
import type {
  DashboardMetrics,
  HelpRequest,
  Incident,
  RecoveryResult,
  Scenario,
  TransportOption,
  VehicleStatus,
  Village,
} from '../data/types';

// ── Presentation helpers ─────────────────────────────────────

const SCENARIOS: Array<
  Scenario & { icon: typeof AlertTriangle; accent: string; iconClass: string }
> = [
  {
    id: 'SCN-BREAKDOWN',
    name: 'Bus breakdown',
    description: 'B2 is reported broken down. Van V1 has 8 verified seats for 12 Village C students.',
    icon: BusFront,
    accent: 'border-amber-200 hover:border-amber-300',
    iconClass: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'SCN-OVERCROWDING',
    name: 'Overcrowding',
    description: 'Bus B1 is full. Villages A and B have no spare verified capacity.',
    icon: Users,
    accent: 'border-orange-200 hover:border-orange-300',
    iconClass: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'SCN-ROADBLOCK',
    name: 'Road blocked',
    description: 'The southern corridor is blocked. No verified vehicle can reach Village C.',
    icon: CloudRain,
    accent: 'border-sky-200 hover:border-sky-300',
    iconClass: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'SCN-NOBACKUP',
    name: 'Zero backup',
    description: 'B2 breaks down and V1 is unavailable. 0 seats, 12 honest escalations.',
    icon: CircleSlash2,
    accent: 'border-rose-200 hover:border-rose-300',
    iconClass: 'bg-rose-100 text-rose-800',
  },
];

const INCIDENT_LABELS: Record<string, string> = {
  no_show: 'No-show',
  full: 'Full bus',
  breakdown: 'Breakdown',
  delay: 'Delayed',
  road_block: 'Road block',
};

const REQUEST_LABELS: Record<string, string> = {
  pending: 'Pending review',
  proposed: 'Seat proposed',
  confirmed: 'Seat confirmed',
  unserved: 'Unserved',
  escalated: 'School help requested',
};

function formatClock(minutes?: number): string {
  if (minutes === undefined || !Number.isFinite(minutes)) return '—';
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function requestTone(status: string): string {
  if (status === 'confirmed') return 'bg-teal-50 text-teal-800 ring-teal-200';
  if (status === 'unserved') return 'bg-rose-50 text-rose-800 ring-rose-200';
  if (status === 'escalated') return 'bg-indigo-50 text-indigo-800 ring-indigo-200';
  if (status === 'proposed') return 'bg-amber-50 text-amber-900 ring-amber-200';
  return 'bg-stone-100 text-stone-700 ring-stone-200';
}

interface ToastState {
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface WhyState {
  title: string;
  eyebrow: string;
  explanation: string;
  facts: string[];
}

export function CoordinatorDashboard() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [transports, setTransports] = useState<TransportOption[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [plan, setPlan] = useState<RecoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIncident, setBusyIncident] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [why, setWhy] = useState<WhyState | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [pendingScenario, setPendingScenario] = useState<Scenario | null>(null);
  const sseTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone });
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(
    () => () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      if (sseTimer.current !== null) window.clearTimeout(sseTimer.current);
    },
    [],
  );

  const loadAll = useCallback(async () => {
    try {
      const [villageList, transportList, incidentList, requestList, metricData] =
        await Promise.all([
          fetchVillages(),
          fetchTransport(),
          fetchIncidents(),
          fetchHelpRequests(),
          fetchDashboardMetrics(),
        ]);
      setVillages(villageList);
      setTransports(transportList);
      setIncidents(incidentList);
      setRequests(requestList);
      setMetrics(metricData);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not reach the demo backend. Check that it is running on port 3000.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ── SSE: refresh the canonical state after any mutation ─────
  const handleSse = useCallback(() => {
    if (sseTimer.current !== null) window.clearTimeout(sseTimer.current);
    sseTimer.current = window.setTimeout(() => {
      sseTimer.current = null;
      void loadAll();
    }, 360);
  }, [loadAll]);

  const { status: sseStatus } = useSSE(handleSse, { enabled: !loading });

  // ── Derived canonical state ─────────────────────────────────
  const villageNameById = useMemo(
    () => new Map(villages.map((village) => [village.id, village.name])),
    [villages],
  );
  const transportById = useMemo(
    () => new Map(transports.map((transport) => [transport.id, transport])),
    [transports],
  );

  const requestCountByIncident = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of requests) {
      counts.set(request.incident_id, (counts.get(request.incident_id) ?? 0) + 1);
    }
    return counts;
  }, [requests]);

  const confirmedSeatsByTransport = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of requests) {
      if (request.status !== 'confirmed' || !request.assignedOptionId) continue;
      counts.set(request.assignedOptionId, (counts.get(request.assignedOptionId) ?? 0) + 1);
    }
    return counts;
  }, [requests]);

  const enrichedTransports = useMemo(
    () =>
      transports.map((transport) => {
        const confirmedAssignments = confirmedSeatsByTransport.get(transport.id) ?? 0;
        return {
          ...transport,
          confirmedAssignments,
          freeSeats: Math.max(
            0,
            transport.capacity - transport.occupied_seats - confirmedAssignments,
          ),
        };
      }),
    [transports, confirmedSeatsByTransport],
  );

  const enrichedIncidents = useMemo(
    () =>
      incidents.map((incident) => ({
        ...incident,
        transportLabel:
          transportById.get(incident.transport_option_id)?.label ??
          incident.transport_option_id,
        requestCount: requestCountByIncident.get(incident.id) ?? 0,
      })),
    [incidents, transportById, requestCountByIncident],
  );

  const reportedIncidents = enrichedIncidents.filter(
    (incident) => incident.status === 'reported',
  );
  const confirmedIncidents = enrichedIncidents.filter(
    (incident) => incident.status === 'confirmed',
  );
  const dismissedIncidents = enrichedIncidents.filter(
    (incident) => incident.status === 'dismissed',
  );

  const confirmedIncidentIds = useMemo(
    () => new Set(confirmedIncidents.map((incident) => incident.id)),
    [confirmedIncidents],
  );
  const affectedRequests = useMemo(
    () => requests.filter((request) => confirmedIncidentIds.has(request.incident_id)),
    [requests, confirmedIncidentIds],
  );

  const affected = metrics?.affectedRequests ?? affectedRequests.length;
  const confirmedPlacements = metrics?.confirmedPlacements ?? 0;
  const unserved = metrics?.unserved ?? Math.max(0, affected - confirmedPlacements);
  const draftCount = plan?.proposedCount ?? metrics?.eligibleProposals ?? 0;
  const freeSeats = metrics?.freeSeats ?? enrichedTransports.reduce(
    (total, transport) =>
      transport.status === 'active' && transport.verified
        ? total + Math.max(0, transport.freeSeats ?? 0)
        : total,
    0,
  );

  // ── Actions ─────────────────────────────────────────────────
  const updateIncident = async (id: string, status: 'confirmed' | 'dismissed') => {
    setBusyIncident(id);
    try {
      const result = await updateIncidentStatus(id, status);
      if (result?.error) throw new Error(result.error);
      notify(
        status === 'confirmed'
          ? 'Disruption verified. Student requests are now in the planning queue.'
          : 'Report dismissed. It will not affect allocation.',
        status === 'confirmed' ? 'success' : 'info',
      );
      setPlan(null);
      await loadAll();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Could not update the incident.', 'error');
    } finally {
      setBusyIncident(null);
    }
  };

  const runEngine = async () => {
    if (confirmedIncidents.length === 0) {
      notify('Verify at least one disruption before running the engine.', 'error');
      return;
    }
    setRunning(true);
    try {
      const result = await runRecoveryAnalysis();
      if ((result as unknown as { error?: string }).error) {
        throw new Error((result as unknown as { error: string }).error);
      }
      setPlan(result);
      notify(
        `Draft ready: ${result.proposedCount} proposed · ${result.unservedCount} unserved. Draft seats are not reserved.`,
        result.proposedCount > 0 ? 'success' : 'info',
      );
      await loadAll();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Recovery engine failed.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const approvePlan = async () => {
    if (!plan || plan.proposals.length === 0) return;
    setApproving(true);
    try {
      const result = (await approveRecoveryPlan(plan.proposals)) as {
        ok?: boolean;
        error?: string;
        message?: string;
        count?: number;
        unservedCount?: number;
      };
      if (result.ok === false || result.error) {
        throw new Error(result.message ?? result.error ?? 'Approval re-check failed.');
      }
      notify(
        `Plan approved: ${result.count ?? plan.proposedCount} seats confirmed · ${
          result.unservedCount ?? plan.unservedCount
        } unserved. Student statuses updated live.`,
        'success',
      );
      setApproveOpen(false);
      setPlan(null);
      await loadAll();
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : 'Approval failed. Re-run the engine because capacity may have changed.',
        'error',
      );
    } finally {
      setApproving(false);
    }
  };

  const rejectPlan = () => {
    setPlan(null);
    notify('Draft rejected. No seats were confirmed.', 'info');
  };

  const saveVehicle = async (
    transport: TransportOption,
    patch: { occupiedSeats?: number; status?: VehicleStatus },
  ): Promise<boolean> => {
    try {
      await updateTransport(transport.id, patch);
      notify(`${transport.id} updated. Capacity re-checked on the next plan.`, 'success');
      setPlan(null);
      await loadAll();
      return true;
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Vehicle update failed.', 'error');
      return false;
    }
  };

  const confirmScenario = async () => {
    if (!pendingScenario) return;
    setResetting(true);
    try {
      const result = await resetScenario(pendingScenario.id);
      if (result?.error) throw new Error(result.error);
      setPlan(null);
      notify(`${pendingScenario.name} loaded. Canonical demo state restored.`, 'success');
      setPendingScenario(null);
      await loadAll();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Scenario reset failed.', 'error');
    } finally {
      setResetting(false);
    }
  };

  const openProposalWhy = (proposal: RecoveryResult['proposals'][number]) => {
    const transport = transportById.get(proposal.transportOptionId);
    setWhy({
      eyebrow: 'Why this recommendation?',
      title: `${proposal.studentId} → ${proposal.transportLabel}`,
      explanation: proposal.explanation,
      facts: [
        `Vehicle ${proposal.transportOptionId} is verified and institution-authorized.`,
        transport
          ? `Departs ${formatClock(transport.departure_min)} · arrives ${formatClock(proposal.arrivalMin ?? transport.arrival_min)} — before the 09:00 deadline.`
          : 'Arrival is checked against the class deadline.',
        transport
          ? `${Math.max(0, transport.capacity - transport.occupied_seats)} free seats before rescue assignments; approval re-checks capacity atomically.`
          : 'Seat capacity is re-checked atomically on approval.',
        proposal.isExamDay
          ? 'Exam-day priority moved this student ahead in the deterministic queue.'
          : 'Ordering is deterministic: fewer alternatives first, then stable student ID.',
      ],
    });
  };

  const openUnservedWhy = (entry: RecoveryResult['unserved'][number]) => {
    setWhy({
      eyebrow: 'Why no seat?',
      title: `${entry.studentId} remains unserved`,
      explanation: entry.explanation,
      facts: [
        'No verified seat is fabricated, and no student is overbooked.',
        'The reason code is recorded honestly for the school escalation path.',
        'Cancelling or adding capacity allows a safe re-plan with the same rules.',
      ],
    });
  };

  const openRequestWhy = (request: HelpRequest) => {
    const incident = enrichedIncidents.find((item) => item.id === request.incident_id);
    const vehicle = request.assignedOptionId
      ? transportById.get(request.assignedOptionId)
      : undefined;
    setWhy({
      eyebrow: 'Request lifecycle',
      title: `${request.id} · ${request.student_id}`,
      explanation:
        request.status === 'confirmed' && vehicle
          ? `${request.student_id} has a confirmed seat on ${vehicle.label}. Capacity was re-checked atomically at approval.`
          : request.status === 'escalated'
            ? 'The student has requested in-app school assistance. No SMS or WhatsApp is claimed.'
            : request.status === 'unserved'
              ? 'The engine proved that no verified seat could serve this student safely. The school escalation option stays available.'
              : `This request is linked to ${incident?.transport_option_id ?? 'a disruption'} and is waiting for a verified recovery plan.`,
      facts: [
        `Current status: ${REQUEST_LABELS[request.status] ?? request.status}.`,
        incident
          ? `Incident ${INCIDENT_LABELS[incident.type] ?? incident.type} is ${incident.status}.`
          : 'Incident details are unavailable.',
        request.isExamDay ? 'Exam-day priority is applied in the engine queue.' : 'Standard priority queue.',
      ],
    });
  };

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-stone-500">
        <Loader2 size={26} className="animate-spin text-teal-700" />
        <p className="text-sm font-semibold">Connecting to the recovery console…</p>
      </div>
    );
  }

  if (error && incidents.length === 0) {
    return (
      <EmptyState
        tone="danger"
        eyebrow="Backend unavailable"
        title="The coordinator console cannot reach the demo API"
        description={`${error} Start the backend with npm run dev in backend/, or verify VITE_API_URL. The student preview can still run on local fixtures.`}
        icon={<WifiOff size={22} />}
        action={
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadAll();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"
          >
            <RefreshCw size={15} />
            Retry connection
          </button>
        }
      />
    );
  }

  const approvedCount = plan?.proposedCount ?? 0;
  const unservedDraftCount = plan?.unservedCount ?? 0;

  return (
    <div className="space-y-5 pb-12">
      {/* Toast */}
      {toast ? (
        <div
          className={`fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ring-1 ring-inset ${
            toast.tone === 'success'
              ? 'bg-teal-800 text-white ring-teal-700'
              : toast.tone === 'error'
                ? 'bg-rose-700 text-white ring-rose-600'
                : 'bg-stone-800 text-white ring-stone-700'
          }`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          {toast.tone === 'success' ? (
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          ) : toast.tone === 'error' ? (
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          ) : (
            <Info size={17} className="mt-0.5 shrink-0" />
          )}
          <span className="leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="ml-1 shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950 p-5 text-teal-50 shadow-[0_30px_80px_-50px_rgba(4,47,39,0.9)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
              <ShieldCheck size={12} />
              Coordinator control room · simulated data
            </p>
            <h1 className="mt-1.5 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl">
              Turn a failed bus into a verified, honest recovery plan.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-100/75">
              Verify student signals, inspect free capacity, run deterministic allocation,
              then approve or reject. Unserved students are never hidden behind a fake ride.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset ${
                  sseStatus === 'open'
                    ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/30'
                    : 'bg-amber-400/10 text-amber-200 ring-amber-300/30'
                }`}
              >
                {sseStatus === 'open' ? <Wifi size={12} /> : <WifiOff size={12} />}
                {sseStatus === 'open' ? 'Live updates connected' : 'Reconnecting live updates'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-teal-100 ring-1 ring-inset ring-white/10">
                <Clock3 size={12} />
                Demo clock 08:00 · class 09:00
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-teal-100 ring-1 ring-inset ring-white/10">
                <ShieldCheck size={12} />
                Verified vehicles only
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3.5 text-xs font-bold text-teal-50 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
            >
              <RefreshCw size={14} />
              Refresh state
            </button>
            <button
              type="button"
              onClick={() => void runEngine()}
              disabled={running || confirmedIncidents.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-extrabold text-amber-950 shadow-lg shadow-amber-950/20 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Run recovery engine
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Showing the last known state. Refresh failed: {error}</span>
        </div>
      ) : null}

      {/* Metrics */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Recovery overview">
        {[
          {
            label: 'Affected students',
            value: affected,
            hint: `${confirmedIncidents.length} confirmed disruption${confirmedIncidents.length === 1 ? '' : 's'}`,
            icon: Users,
            tone: 'text-rose-700 bg-rose-50 ring-rose-100',
          },
          {
            label: 'Confirmed seats',
            value: confirmedPlacements,
            hint: 'Approved recovery placements',
            icon: CheckCircle2,
            tone: 'text-teal-700 bg-teal-50 ring-teal-100',
          },
          {
            label: 'Unserved',
            value: unserved,
            hint: unserved > 0 ? 'Escalation path available' : 'No student left behind',
            icon: TriangleAlert,
            tone:
              unserved > 0
                ? 'text-amber-800 bg-amber-50 ring-amber-100'
                : 'text-stone-500 bg-stone-50 ring-stone-200',
          },
          {
            label: plan ? 'Draft seats' : 'Eligible seats',
            value: draftCount,
            hint: plan ? 'Not reserved until approval' : 'Run the engine to draft',
            icon: Sparkles,
            tone: 'text-indigo-700 bg-indigo-50 ring-indigo-100',
          },
        ].map(({ label, value, hint, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_45px_-42px_rgba(7,32,28,0.6)]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-stone-400">
                {label}
              </p>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ${tone}`}>
                <Icon size={14} />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold leading-none tracking-tight text-stone-900">
              {value}
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-stone-400">{hint}</p>
          </div>
        ))}
      </section>

      {/* Scenario switcher */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_45px_-42px_rgba(7,32,28,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-stone-800">
              <Gauge size={16} className="text-teal-700" />
              Scenario simulator
            </h2>
            <p className="mt-0.5 text-[11px] text-stone-400">
              Each preset restores the canonical fixture and clears drafts. All data is simulated.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-indigo-700 ring-1 ring-inset ring-indigo-200">
            Demo presets
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setPendingScenario(scenario)}
                className={`group flex min-h-[86px] items-start gap-2.5 rounded-xl border bg-stone-50/60 p-3 text-left transition-all hover:bg-white ${scenario.accent}`}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${scenario.iconClass}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-extrabold text-stone-800">{scenario.name}</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-500">
                    {scenario.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        {/* Incident queue */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-stone-900">
                <Megaphone size={17} className="text-amber-600" />
                Disruption queue
              </h2>
              <p className="text-xs text-stone-500">
                Student reports stay unverified until a coordinator acts.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-800 ring-1 ring-inset ring-amber-200">
              {reportedIncidents.length} waiting
            </span>
          </div>

          {reportedIncidents.length > 0 ? (
            <div className="space-y-2.5">
              {reportedIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  transportLabel={incident.transportLabel}
                  requestCount={incident.requestCount}
                  villageNames={incident.affectedVillageIds.map(
                    (id) => villageNameById.get(id) ?? id,
                  )}
                  busy={busyIncident === incident.id}
                  onConfirm={() => void updateIncident(incident.id, 'confirmed')}
                  onDismiss={() => void updateIncident(incident.id, 'dismissed')}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              tone="success"
              eyebrow="Queue clear"
              title="No unverified reports"
              description="Student signals will appear here in real time. Confirm only after checking the vehicle."
              icon={<ShieldCheck size={22} />}
            />
          )}

          {confirmedIncidents.length > 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                  Confirmed disruptions · {confirmedIncidents.length}
                </p>
                <span className="text-[10px] font-semibold text-rose-500">
                  These enter the engine
                </span>
              </div>
              <div className="space-y-1.5">
                {confirmedIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-inset ring-rose-100"
                  >
                    <span className="font-extrabold text-stone-800">
                      {incident.transportLabel}
                    </span>
                    <StatusChip status="confirmed" />
                    <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                      {INCIDENT_LABELS[incident.type] ?? incident.type}
                    </span>
                    <span className="ml-auto text-[11px] text-stone-500">
                      {incident.requestCount} request{incident.requestCount === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {dismissedIncidents.length > 0 ? (
            <p className="px-1 text-[11px] text-stone-400">
              {dismissedIncidents.length} dismissed report
              {dismissedIncidents.length === 1 ? '' : 's'} hidden from allocation.
            </p>
          ) : null}
        </section>

        {/* Recovery engine panel */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-stone-900">
                <Zap size={17} className="text-indigo-600" />
                Recovery plan
              </h2>
              <p className="text-xs text-stone-500">
                Deterministic allocation · no overbooking · draft first.
              </p>
            </div>
            {plan ? (
              <StatusChip status={plan.proposals.length > 0 ? 'proposed' : 'unserved'} />
            ) : null}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_45px_-42px_rgba(7,32,28,0.6)]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void runEngine()}
                disabled={running || confirmedIncidents.length === 0}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-700 px-3.5 text-xs font-extrabold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {plan ? 'Re-run engine' : 'Draft proposals'}
              </button>
              {plan ? (
                <button
                  type="button"
                  onClick={rejectPlan}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <RotateCcw size={13} />
                  Reject draft
                </button>
              ) : null}
              <span className="ml-auto text-[10px] font-semibold text-stone-400">
                {confirmedIncidents.length === 0
                  ? 'Verify a disruption first'
                  : `${confirmedIncidents.length} confirmed disruption${confirmedIncidents.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {!plan ? (
              <EmptyState
                className="mt-3"
                tone="info"
                eyebrow="No draft yet"
                title="Draft a safe recovery plan"
                description="Run the engine to see verified seat proposals and honest unserved reasons. Nothing is reserved until you approve."
                icon={<Sparkles size={22} />}
              />
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 divide-x divide-stone-200 rounded-xl bg-stone-50 p-3 ring-1 ring-inset ring-stone-200/70">
                  <div className="pr-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
                      Affected
                    </p>
                    <p className="text-xl font-extrabold text-stone-900">{plan.affectedCount}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
                      Proposed
                    </p>
                    <p className="text-xl font-extrabold text-teal-700">{approvedCount}</p>
                  </div>
                  <div className="pl-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">
                      Unserved
                    </p>
                    <p className="text-xl font-extrabold text-rose-700">{unservedDraftCount}</p>
                  </div>
                </div>

                {plan.engineNote ? (
                  <p className="rounded-xl bg-indigo-50/70 px-3 py-2 text-[11px] font-semibold leading-relaxed text-indigo-900 ring-1 ring-inset ring-indigo-100">
                    {plan.engineNote}
                  </p>
                ) : null}

                {plan.proposals.length > 0 ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">
                        Proposed seats · {plan.proposals.length}
                      </p>
                      <span className="text-[10px] text-stone-400">Draft only</span>
                    </div>
                    <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                      {plan.proposals.map((proposal) => {
                        const transport = transportById.get(proposal.transportOptionId);
                        return (
                          <div
                            key={proposal.requestId}
                            className={`rounded-xl border p-2.5 ${
                              proposal.isExamDay
                                ? 'border-indigo-200 bg-indigo-50/60'
                                : 'border-teal-100 bg-teal-50/40'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              {proposal.isExamDay ? (
                                <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white">
                                  Exam
                                </span>
                              ) : null}
                              <span className="text-xs font-extrabold text-stone-800">
                                {proposal.studentId}
                              </span>
                              <ArrowRight size={11} className="text-stone-400" />
                              <span className="min-w-0 truncate text-[11px] font-bold text-teal-800">
                                {proposal.transportLabel}
                              </span>
                              {proposal.arrivalMin !== undefined ? (
                                <span className="ml-auto shrink-0 text-[10px] font-semibold text-stone-500">
                                  ETA {formatClock(proposal.arrivalMin)}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="truncate text-[10px] text-stone-500">
                                {transport
                                  ? `${transport.villageIds
                                      .map((id) => villageNameById.get(id) ?? id)
                                      .join(', ')} → Demo District College`
                                  : 'Verified route'}
                              </p>
                              <button
                                type="button"
                                onClick={() => openProposalWhy(proposal)}
                                className="shrink-0 text-[10px] font-bold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
                              >
                                Why?
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {plan.unserved.length > 0 ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                        Unserved · {plan.unserved.length}
                      </p>
                      <span className="text-[10px] text-stone-400">No fake ride</span>
                    </div>
                    <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                      {plan.unserved.map((entry) => (
                        <div
                          key={entry.requestId}
                          className="rounded-xl border border-rose-100 bg-rose-50/60 p-2.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-stone-800">
                              {entry.studentId}
                            </span>
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-rose-800">
                              {entry.reason.replace(/_/g, ' ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => openUnservedWhy(entry)}
                              className="ml-auto text-[10px] font-bold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
                            >
                              Why no seat?
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] leading-relaxed text-rose-800/80">
                            {entry.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-stone-200 pt-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setApproveOpen(true)}
                    disabled={approving || plan.proposals.length === 0}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-extrabold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {approving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ClipboardCheck size={15} />
                    )}
                    Approve plan
                  </button>
                  <button
                    type="button"
                    onClick={rejectPlan}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50"
                  >
                    <X size={15} />
                    Reject
                  </button>
                </div>
                <p className="text-center text-[10px] leading-relaxed text-stone-400">
                  Approval re-checks every vehicle's capacity and incident status atomically.
                  Draft seats never reduce availability.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Vehicle inventory */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-stone-900">
              <BusFront size={17} className="text-teal-700" />
              Verified vehicle inventory
            </h2>
            <p className="text-xs text-stone-500">
              Edit occupied seats or operative status. Confirmed rescue seats stay protected.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em]">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700 ring-1 ring-inset ring-teal-200">
              {metrics?.verifiedVehicles ?? enrichedTransports.filter((t) => t.verified).length} verified
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600 ring-1 ring-inset ring-stone-200">
              {freeSeats} free seats
            </span>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {enrichedTransports.map((transport) => (
            <VehicleCard
              key={transport.id}
              transport={transport}
              confirmedAssignments={transport.confirmedAssignments ?? 0}
              routeNames={transport.villageIds.map(
                (id) => villageNameById.get(id) ?? id,
              )}
              onSave={(patch) => saveVehicle(transport, patch)}
            />
          ))}
        </div>
      </section>

      {/* Affected students */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_45px_-42px_rgba(7,32,28,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-stone-900">
              <Users size={17} className="text-indigo-600" />
              Affected student requests
            </h2>
            <p className="text-xs text-stone-500">
              One canonical request per student and disruption. Duplicates are blocked in SQLite.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-stone-600 ring-1 ring-inset ring-stone-200">
            {affectedRequests.length} affected
          </span>
        </div>

        {affectedRequests.length > 0 ? (
          <div className="mt-3 max-h-[360px] overflow-y-auto">
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {affectedRequests.map((request) => {
                const transport = request.assignedOptionId
                  ? transportById.get(request.assignedOptionId)
                  : undefined;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => openRequestWhy(request)}
                    className="flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50/70 px-2.5 py-2 text-left transition-colors hover:border-stone-200 hover:bg-white"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-extrabold text-stone-500 ring-1 ring-inset ring-stone-200">
                      {request.student_id.replace('STU-', '').slice(-3)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-stone-800">
                          {request.student_id}
                        </span>
                        {request.isExamDay ? (
                          <span className="rounded bg-indigo-600 px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.06em] text-white">
                            Exam
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] text-stone-400">
                        {transport ? transport.label : request.id}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.05em] ring-1 ring-inset ${requestTone(request.status)}`}
                    >
                      {REQUEST_LABELS[request.status] ?? request.status}
                    </span>
                    <ChevronRight size={12} className="shrink-0 text-stone-300" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            className="mt-3"
            tone="neutral"
            eyebrow="No confirmed disruption"
            title="No affected students yet"
            description="Verify a reported incident and its linked student requests will appear here."
            icon={<Users size={22} />}
          />
        )}

        {requests.some((request) => request.status === 'escalated') ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-[11px] font-semibold text-indigo-900">
            <LifeBuoy size={14} className="mt-0.5 shrink-0" />
            <span>
              {requests.filter((request) => request.status === 'escalated').length} student
              {requests.filter((request) => request.status === 'escalated').length === 1
                ? ''
                : 's'}{' '}
              requested in-app school assistance. No SMS or WhatsApp was sent.
            </span>
          </div>
        ) : null}
      </section>

      {/* Detail modal */}
      <Modal
        isOpen={Boolean(why)}
        onClose={() => setWhy(null)}
        title={why?.title ?? ''}
        eyebrow={why?.eyebrow}
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
              <ShieldCheck size={13} className="text-teal-700" />
              Deterministic, explainable, safety-first.
            </span>
            <button
              type="button"
              onClick={() => setWhy(null)}
              className="inline-flex min-h-9 items-center rounded-lg bg-stone-900 px-3 text-xs font-bold text-white hover:bg-stone-800"
            >
              Understood
            </button>
          </div>
        }
      >
        {why ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-teal-50 px-3 py-2.5 text-sm leading-relaxed text-teal-950 ring-1 ring-inset ring-teal-100">
              {why.explanation}
            </p>
            <ul className="space-y-2">
              {why.facts.map((fact) => (
                <li key={fact} className="flex gap-2 text-xs leading-relaxed text-stone-600">
                  <Check size={14} className="mt-0.5 shrink-0 text-teal-700" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>

      {/* Approval confirmation */}
      <Modal
        isOpen={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve this recovery plan?"
        eyebrow="Final capacity check"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApproveOpen(false)}
              className="inline-flex min-h-10 items-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void approvePlan()}
              disabled={approving}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-extrabold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {approving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Approve {plan?.proposedCount ?? 0} seats
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-stone-600">
          <p>
            The backend will re-read every request, incident, and vehicle inside one SQLite
            transaction. If any seat is no longer available, the whole plan is rejected.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-stone-50 p-3 text-center ring-1 ring-inset ring-stone-200">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-stone-400">Affected</p>
              <p className="text-xl font-extrabold text-stone-900">{plan?.affectedCount ?? 0}</p>
            </div>
            <div className="rounded-xl bg-teal-50 p-3 text-center ring-1 ring-inset ring-teal-100">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-teal-600">Confirming</p>
              <p className="text-xl font-extrabold text-teal-800">{plan?.proposedCount ?? 0}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-3 text-center ring-1 ring-inset ring-rose-100">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-rose-500">Unserved</p>
              <p className="text-xl font-extrabold text-rose-700">{plan?.unservedCount ?? 0}</p>
            </div>
          </div>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">
            Approval updates student statuses live through SSE. No SMS is sent; this is an in-app
            placement only.
          </p>
        </div>
      </Modal>

      {/* Scenario confirmation */}
      <Modal
        isOpen={Boolean(pendingScenario)}
        onClose={() => setPendingScenario(null)}
        title={`Load “${pendingScenario?.name ?? 'scenario'}”?`}
        eyebrow="Demo simulator"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingScenario(null)}
              className="inline-flex min-h-10 items-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmScenario()}
              disabled={resetting}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-stone-900 px-4 text-xs font-extrabold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Reset and load
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-stone-600">
          <p>{pendingScenario?.description}</p>
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 ring-1 ring-inset ring-rose-200">
            This clears current requests, incidents, and approved placements, then restores the
            canonical demo fixture. Draft plans are discarded.
          </p>
        </div>
      </Modal>
    </div>
  );
}
