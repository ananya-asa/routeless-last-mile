// ============================================================
// StudentHome.tsx — Person 3 student arrival-experience track.
//
// API-first: probes the committed Hono backend, then uses live demo data and
// SSE. If the backend is absent, it falls back to the canonical seeded fixtures
// with an explicit preview label and simulated coordinator controls.
// ============================================================

import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
  BusFront,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FlaskConical,
  HelpCircle,
  Info,
  Landmark,
  LifeBuoy,
  Loader2,
  MapPin,
  Megaphone,
  Phone,
  RefreshCw,
  RotateCcw,
  Route,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  checkBackendHealth,
  createHelpRequest,
  escalateHelpRequest,
  fetchHelpRequests,
  fetchIncidents,
  fetchTransport,
  fetchVillages,
  latestRequestForStudent,
  reportIncident,
} from '../api/client';
import { AssignmentCard } from '../components/AssignmentCard';
import { DemoBadge } from '../components/DemoBadge';
import { EmptyState } from '../components/EmptyState';
import { StatusChip } from '../components/StatusChip';
import { BrandLogo } from '../components/student/BrandLogo';
import { CrowdingChip } from '../components/student/CrowdingChip';
import { DemoDock } from '../components/student/DemoDock';
import {
  activeIncidentForTransport,
  backupForVillage,
  buildDemoProposal,
  busForVillage,
  DEMO_CLASS_START_MIN,
  DEMO_PENDING_REPORTS,
  DEMO_REQUEST_ID,
  demoIncidents,
  demoTransports,
  demoVillages,
  formatTime,
  getCrowding,
  stageFromLive,
  STUDENT_ID,
  type StudentStage,
} from '../components/student/demo';
import { LanguageProvider, useCopy, type Lang } from '../components/student/i18n';
import { ReportSheet } from '../components/student/ReportSheet';
import { RouteScene } from '../components/student/RouteScene';
import { SplashScreen } from '../components/student/SplashScreen';
import { StatusTimeline } from '../components/student/StatusTimeline';
import { useSSE } from '../hooks/useSSE';
import type {
  HelpRequest,
  Incident,
  IncidentType,
  RecoveryProposal,
  TransportOption,
  Village,
} from '../data/types';
import '../components/student/student.css';

type Mode = 'checking' | 'live' | 'preview';
type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  tone: ToastTone;
  message: string;
  key: number;
}

interface LiveData {
  villages: Village[];
  transports: TransportOption[];
  incidents: Incident[];
  requests: HelpRequest[];
}

async function loadLiveData(): Promise<LiveData> {
  const [villages, transports, incidents, requests] = await Promise.all([
    fetchVillages(),
    fetchTransport(),
    fetchIncidents(),
    fetchHelpRequests(),
  ]);
  return { villages, transports, incidents, requests };
}

const EN_MESSAGES = {
  connecting: 'Checking the demo backend…',
  liveBackend: 'Demo backend connected',
  previewMode: 'Preview mode',
  liveSub: 'Live demo data · still simulated',
  previewSub: 'Simulated on this device',
  retry: 'Try live connection',
  cannotReach: "Can't reach the demo backend. Preview mode stays on.",
  syncPaused: 'Live updates paused. Retrying…',
  reportSaved: 'Report saved on this device. Preview mode — not sent to school.',
  reportSent: 'Report sent to the demo backend. A seat is still not promised.',
  reportFailed: 'Could not send the report. Please try again.',
  escalated: 'School help requested. No SMS was sent — this is an in-app request.',
  escalateFailed: 'Could not request school help. Please try again.',
  reportFirst: 'Report the trip first, then ask for school help.',
  noRoute: 'No route is available to report for this village.',
  refreshed: 'Live demo data refreshed.',
  resetPreview: 'Preview reset to the start.',
  closeToast: 'Dismiss notification',
  liveNote: 'Connected to the committed demo backend. All transport data is still simulated.',
  previewNote: 'Backend unavailable. Everything here runs on local fixtures.',
  noBackup: 'No verified backup',
  verifiedBackup: 'Verified backup available',
  classDeadline: 'Class deadline',
  beforeClass: 'Before 09:00',
  accessible: 'Step-free access',
  driver: 'Driver',
  seats: 'seats',
  free: 'free',
  of: 'of',
  refresh: 'Refresh',
  reportedIssue: 'Reported issue',
  detailsFallback: 'No extra details provided.',
  yourRequest: 'Your request',
  requestId: 'Request',
  next: 'What happens next',
  mode: 'Connection',
  language: 'Language',
  transport: 'Transport',
  college: 'College',
  replay: 'Replay intro',
};

type Messages = { [K in keyof typeof EN_MESSAGES]: string };

const KN_MESSAGES: Messages = {
  connecting: 'ಡೆಮೊ ಬ್ಯಾಕೆಂಡ್ ಪರಿಶೀಲಿಸುತ್ತಿದೆ…',
  liveBackend: 'ಡೆಮೊ ಬ್ಯಾಕೆಂಡ್ ಸಂಪರ್ಕಗೊಂಡಿದೆ',
  previewMode: 'ಮುನ್ನೋಟ ಮೋಡ್',
  liveSub: 'ನೇರ ಡೆಮೊ ಡೇಟಾ · ಸಿಮ್ಯುಲೇಟೆಡ್',
  previewSub: 'ಈ ಸಾಧನದಲ್ಲಿ ಸಿಮ್ಯುಲೇಟೆಡ್',
  retry: 'ನೇರ ಸಂಪರ್ಕ ಪ್ರಯತ್ನಿಸಿ',
  cannotReach: 'ಡೆಮೊ ಬ್ಯಾಕೆಂಡ್ ಸಿಗುತ್ತಿಲ್ಲ. ಮುನ್ನೋಟ ಮೋಡ್ ಮುಂದುವರಿಯುತ್ತದೆ.',
  syncPaused: 'ನೇರ ನವೀಕರಣ ನಿಂತಿದೆ. ಮರುಸಂಪರ್ಕ…',
  reportSaved: 'ವರದಿ ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ. ಮುನ್ನೋಟ — ಶಾಲೆಗೆ ಕಳುಹಿಸಿಲ್ಲ.',
  reportSent: 'ವರದಿ ಡೆಮೊ ಬ್ಯಾಕೆಂಡ್‌ಗೆ ಹೋಗಿದೆ. ಸೀಟಿನ ಭರವಸೆ ಇನ್ನೂ ಇಲ್ಲ.',
  reportFailed: 'ವರದಿ ಕಳುಹಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  escalated: 'ಶಾಲಾ ಸಹಾಯ ಕೋರಲಾಗಿದೆ. SMS ಕಳುಹಿಸಿಲ್ಲ — ಇದು ಆ್ಯಪ್ ವಿನಂತಿ.',
  escalateFailed: 'ಶಾಲಾ ಸಹಾಯ ಕೋರಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  reportFirst: 'ಮೊದಲು ಪ್ರಯಾಣ ವರದಿ ಮಾಡಿ, ನಂತರ ಸಹಾಯ ಕೇಳಿ.',
  noRoute: 'ಈ ಗ್ರಾಮದ ಪ್ರಯಾಣವನ್ನು ವರದಿ ಮಾಡಲು ಮಾರ್ಗವಿಲ್ಲ.',
  refreshed: 'ನೇರ ಡೆಮೊ ಡೇಟಾ ನವೀಕರಿಸಲಾಗಿದೆ.',
  resetPreview: 'ಮುನ್ನೋಟ ಮೊದಲ ಸ್ಥಿತಿಗೆ ಮರಳಿದೆ.',
  closeToast: 'ಅಧಿಸೂಚನೆ ಮುಚ್ಚಿ',
  liveNote: 'ಸಮರ್ಪಿತ ಡೆಮೊ ಬ್ಯಾಕೆಂಡ್‌ಗೆ ಸಂಪರ್ಕ. ಎಲ್ಲಾ ಸಾರಿಗೆ ಡೇಟಾ ಸಿಮ್ಯುಲೇಟೆಡ್.',
  previewNote: 'ಬ್ಯಾಕೆಂಡ್ ಲಭ್ಯವಿಲ್ಲ. ಎಲ್ಲವೂ ಸ್ಥಳೀಯ ಫಿಕ್ಸ್ಚರ್‌ನಲ್ಲಿ ನಡೆಯುತ್ತದೆ.',
  noBackup: 'ಪರಿಶೀಲಿಸಿದ ಬ್ಯಾಕಪ್ ಇಲ್ಲ',
  verifiedBackup: 'ಪರಿಶೀಲಿಸಿದ ಬ್ಯಾಕಪ್ ಲಭ್ಯ',
  classDeadline: 'ತರಗತಿ ಗಡುವು',
  beforeClass: '09:00ಕ್ಕೆ ಮೊದಲು',
  accessible: 'ಮೆಟ್ಟಿಲಿಲ್ಲದ ಪ್ರವೇಶ',
  driver: 'ಚಾಲಕ',
  seats: 'ಸೀಟುಗಳು',
  free: 'ಖಾಲಿ',
  of: 'ರಲ್ಲಿ',
  refresh: 'ನವೀಕರಿಸಿ',
  reportedIssue: 'ವರದಿಯಾದ ಸಮಸ್ಯೆ',
  detailsFallback: 'ಹೆಚ್ಚಿನ ವಿವರ ನೀಡಿಲ್ಲ.',
  yourRequest: 'ನಿಮ್ಮ ವಿನಂತಿ',
  requestId: 'ವಿನಂತಿ',
  next: 'ಮುಂದೆ ಏನಾಗುತ್ತದೆ',
  mode: 'ಸಂಪರ್ಕ',
  language: 'ಭಾಷೆ',
  transport: 'ಸಾರಿಗೆ',
  college: 'ಕಾಲೇಜು',
  replay: 'ಪರಿಚಯ ಮತ್ತೆ',
};

export function StudentHome() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      return window.localStorage.getItem('routeless:lang') === 'kn' ? 'kn' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('routeless:lang', lang);
    } catch {
      /* Private mode can block storage; language still works in-session. */
    }
  }, [lang]);

  return (
    <LanguageProvider lang={lang} setLang={setLang}>
      <StudentHomeBody />
    </LanguageProvider>
  );
}

function StudentHomeBody() {
  const { t, lang, setLang } = useCopy();
  const msgs = lang === 'kn' ? KN_MESSAGES : EN_MESSAGES;

  const [mode, setMode] = useState<Mode>('checking');
  const [villages, setVillages] = useState<Village[]>(demoVillages);
  const [transports, setTransports] = useState<TransportOption[]>(demoTransports);
  const [incidents, setIncidents] = useState<Incident[]>(demoIncidents);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [villageId, setVillageId] = useState('VLG-C');
  const [previewStage, setPreviewStage] = useState<StudentStage>('idle');
  const [previewIssue, setPreviewIssue] = useState<IncidentType>('breakdown');
  const [previewDetails, setPreviewDetails] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [splashOpen, setSplashOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.sessionStorage.getItem('routeless:intro-seen') !== '1';
    } catch {
      return true;
    }
  });

  const notify = useCallback((tone: ToastTone, message: string) => {
    setToast({ tone, message, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const dismissSplash = useCallback(() => {
    setSplashOpen(false);
    try {
      window.sessionStorage.setItem('routeless:intro-seen', '1');
    } catch {
      /* no-op */
    }
  }, []);

  const replayIntro = useCallback(() => setSplashOpen(true), []);

  // ── Boot: one health probe, then live data or clearly labelled preview ──
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const healthy = await checkBackendHealth();
      if (cancelled) return;
      if (!healthy) {
        setMode('preview');
        return;
      }
      try {
        const data = await loadLiveData();
        if (cancelled) return;
        setVillages(data.villages);
        setTransports(data.transports);
        setIncidents(data.incidents);
        setRequests(data.requests);
        setMode('live');
      } catch {
        if (!cancelled) setMode('preview');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    const data = await loadLiveData();
    setVillages(data.villages);
    setTransports(data.transports);
    setIncidents(data.incidents);
    setRequests(data.requests);
  }, []);

  const handleRetryLive = useCallback(async () => {
    setMode('checking');
    setSyncError(null);
    const healthy = await checkBackendHealth();
    if (!healthy) {
      setMode('preview');
      notify('error', msgs.cannotReach);
      return;
    }
    try {
      await refresh();
      setMode('live');
      notify('success', msgs.liveBackend);
    } catch {
      setMode('preview');
      notify('error', msgs.cannotReach);
    }
  }, [refresh, notify, msgs.cannotReach, msgs.liveBackend]);

  const handleRefreshLive = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await refresh();
      notify('success', msgs.refreshed);
    } catch {
      notify('error', msgs.syncPaused);
    } finally {
      setBusy(false);
    }
  }, [busy, refresh, notify, msgs.refreshed, msgs.syncPaused]);

  // ── SSE: backend broadcasts unnamed data frames; refresh after each burst ──
  const sseTimer = useRef<number | null>(null);
  const handleSse = useCallback(() => {
    if (sseTimer.current !== null) window.clearTimeout(sseTimer.current);
    sseTimer.current = window.setTimeout(() => {
      sseTimer.current = null;
      refresh().catch(() => setSyncError(msgs.syncPaused));
    }, 320);
  }, [refresh, msgs.syncPaused]);

  useEffect(
    () => () => {
      if (sseTimer.current !== null) window.clearTimeout(sseTimer.current);
    },
    [],
  );

  const sse = useSSE(handleSse, { enabled: mode === 'live' });

  // ── Derived student view ────────────────────────────────────
  const villageList = villages.length ? villages : demoVillages;
  const village = villageList.find((item) => item.id === villageId) ?? villageList[0];
  const selectedBus = useMemo(
    () => busForVillage(transports, villageId),
    [transports, villageId],
  );
  const backup = useMemo(
    () => backupForVillage(transports, villageId),
    [transports, villageId],
  );
  const selectedIncident = useMemo(
    () => activeIncidentForTransport(incidents, selectedBus?.id),
    [incidents, selectedBus?.id],
  );
  const liveRequest = useMemo(
    () => latestRequestForStudent(requests, STUDENT_ID),
    [requests],
  );
  const liveRequestIncident = useMemo(
    () =>
      liveRequest
        ? incidents.find((incident) => incident.id === liveRequest.incident_id) ?? null
        : null,
    [incidents, liveRequest],
  );
  const stage: StudentStage =
    mode === 'live'
      ? stageFromLive(liveRequest, liveRequestIncident ?? selectedIncident)
      : previewStage;

  const pendingReports =
    mode === 'live'
      ? requests.filter((request) => request.status === 'pending').length
      : DEMO_PENDING_REPORTS;
  const availableSeats = backup
    ? Math.max(0, backup.capacity - backup.occupied_seats)
    : 0;
  const crowding = getCrowding(pendingReports, availableSeats);
  const crowdingLabel =
    crowding.level === 'red'
      ? t.commute.highDemand
      : crowding.level === 'amber'
        ? t.commute.filling
        : t.commute.seatsAvailable;
  const crowdingDetail = `${pendingReports} ${t.commute.reports} · ${availableSeats} ${t.commute.verifiedSeats}`;

  const displayIssue =
    mode === 'live'
      ? liveRequestIncident?.type ?? selectedIncident?.type ?? null
      : stage === 'idle'
        ? null
        : previewIssue;
  const displayDetails =
    mode === 'live'
      ? liveRequestIncident?.details ?? selectedIncident?.details ?? ''
      : previewDetails;
  const incidentConfirmed =
    mode === 'live'
      ? liveRequestIncident?.status === 'confirmed' ||
        selectedIncident?.status === 'confirmed'
      : stage !== 'idle' && stage !== 'reported';

  const busStatus = !selectedBus
    ? 'active'
    : stage === 'idle'
      ? selectedBus.status
      : incidentConfirmed
        ? 'cancelled'
        : 'reported';

  const freeSeats = selectedBus
    ? Math.max(0, selectedBus.capacity - selectedBus.occupied_seats)
    : 0;
  const occupancy = selectedBus
    ? Math.min(
        100,
        Math.round(
          (selectedBus.occupied_seats / Math.max(1, selectedBus.capacity)) * 100,
        ),
      )
    : 100;
  const onTime = selectedBus
    ? selectedBus.arrival_min <= DEMO_CLASS_START_MIN
    : false;

  const proposal = useMemo<RecoveryProposal | null>(() => {
    const vehicle = backup ?? selectedBus;
    if (!vehicle) return null;
    const base = buildDemoProposal(vehicle);
    const seatsFree = Math.max(0, vehicle.capacity - vehicle.occupied_seats);
    const explanation =
      lang === 'kn'
        ? `${vehicle.label} ${village.name} ಗ್ರಾಮಕ್ಕೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ, ${seatsFree} ಸೀಟುಗಳು ಖಾಲಿ ಇವೆ ಮತ್ತು ${formatTime(vehicle.arrival_min)}ಕ್ಕೆ ತಲುಪುತ್ತದೆ — 09:00 ಗಡುವಿಗೆ ಮೊದಲು.`
        : `${vehicle.label} is verified for ${village.name}, has ${seatsFree} free seats, and arrives at ${formatTime(vehicle.arrival_min)} — before the 09:00 class deadline.`;
    return {
      ...base,
      requestId: mode === 'live' && liveRequest ? liveRequest.id : base.requestId,
      studentId: STUDENT_ID,
      explanation,
    };
  }, [backup, selectedBus, lang, village.name, mode, liveRequest]);

  const unservedExplanation = useMemo(() => {
    if (!backup) {
      return lang === 'kn'
        ? `${village.name} ಗ್ರಾಮಕ್ಕೆ ಪರಿಶೀಲಿಸಿದ ಬ್ಯಾಕಪ್ ವಾಹನ ಇಲ್ಲ. ನಕಲಿ ಪ್ರಯಾಣ ಸೂಚಿಸುವುದಿಲ್ಲ.`
        : `No verified backup vehicle serves ${village.name} in this fixture. We will not invent a ride.`;
    }
    const seatsFree = Math.max(0, backup.capacity - backup.occupied_seats);
    return lang === 'kn'
      ? `${backup.label} ನಲ್ಲಿ ಉಳಿದ ${seatsFree} ಪರಿಶೀಲಿಸಿದ ಸೀಟುಗಳು ಈಗಾಗಲೇ ಹಂಚಿಕೆಯಾಗಿವೆ. ಅಧಿಕ ಬುಕಿಂಗ್ ಇಲ್ಲ.`
      : `All ${seatsFree} remaining verified seats on ${backup.label} are already allocated for this run. No overbooking.`;
  }, [backup, lang, village.name]);

  const stageTitle: Record<StudentStage, string> = {
    idle: t.recovery.idleTitle,
    reported: t.recovery.reportedTitle,
    verified: t.recovery.verifiedTitle,
    proposed: t.recovery.proposedTitle,
    confirmed: t.recovery.confirmedTitle,
    unserved: t.recovery.unservedTitle,
    escalated: t.recovery.escalatedTitle,
  };
  const stageBody: Record<StudentStage, string> = {
    idle: t.recovery.idleBody,
    reported: t.recovery.reportedBody,
    verified: t.recovery.verifiedBody,
    proposed: t.recovery.proposedBody,
    confirmed: t.recovery.confirmedBody,
    unserved: t.recovery.unservedBody,
    escalated: t.recovery.escalatedBody,
  };

  // ── Student actions ─────────────────────────────────────────
  const handleReport = useCallback(
    async (issue: IncidentType, details: string) => {
      if (busy) return;

      if (mode === 'preview') {
        setPreviewIssue(issue);
        setPreviewDetails(details);
        setPreviewStage('reported');
        setReportOpen(false);
        notify('success', msgs.reportSaved);
        return;
      }

      if (!selectedBus) {
        notify('error', msgs.noRoute);
        return;
      }

      setBusy(true);
      try {
        let incidentId = selectedIncident?.id;
        if (!incidentId) {
          const created = await reportIncident({
            transportOptionId: selectedBus.id,
            type: issue,
            reportedBy: 'student',
            affectedVillageIds: [villageId],
            details: details || undefined,
          });
          incidentId = created.id;
        }

        try {
          await createHelpRequest(STUDENT_ID, incidentId);
        } catch (error) {
          // A request for this student + incident already exists: that is fine.
          if (!(error instanceof ApiError && error.status === 409)) throw error;
        }

        await refresh();
        setReportOpen(false);
        notify('success', msgs.reportSent);
      } catch (error) {
        notify('error', error instanceof Error ? error.message : msgs.reportFailed);
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      mode,
      selectedBus,
      selectedIncident,
      villageId,
      refresh,
      notify,
      msgs.reportSaved,
      msgs.noRoute,
      msgs.reportSent,
      msgs.reportFailed,
    ],
  );

  const requestEscalation = useCallback(async () => {
    if (busy) return;

    if (mode === 'preview') {
      setPreviewStage('escalated');
      notify('success', msgs.escalated);
      return;
    }

    if (!liveRequest) {
      notify('error', msgs.reportFirst);
      return;
    }

    setBusy(true);
    try {
      await escalateHelpRequest(liveRequest.id);
      await refresh();
      notify('success', msgs.escalated);
    } catch (error) {
      notify('error', error instanceof Error ? error.message : msgs.escalateFailed);
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    mode,
    liveRequest,
    refresh,
    notify,
    msgs.escalated,
    msgs.reportFirst,
    msgs.escalateFailed,
  ]);

  const handleConfirmIncident = useCallback(() => setPreviewStage('verified'), []);
  const handleDraftPlan = useCallback(
    () => setPreviewStage(backup ? 'proposed' : 'unserved'),
    [backup],
  );
  const handleApprovePlan = useCallback(
    () => setPreviewStage(backup ? 'confirmed' : 'unserved'),
    [backup],
  );
  const handleForceUnserved = useCallback(() => setPreviewStage('unserved'), []);
  const handleResetPreview = useCallback(() => {
    setPreviewStage('idle');
    setPreviewIssue('breakdown');
    setPreviewDetails('');
    setToast(null);
    notify('info', msgs.resetPreview);
  }, [notify, msgs.resetPreview]);

  const modeLabel =
    mode === 'checking'
      ? msgs.connecting
      : mode === 'live'
        ? msgs.liveBackend
        : msgs.previewMode;
  const modeSub =
    mode === 'checking'
      ? msgs.connecting
      : mode === 'live'
        ? msgs.liveSub
        : msgs.previewSub;

  return (
    <div className="student-app" lang={lang}>
      {splashOpen ? <SplashScreen onEnter={dismissSplash} /> : null}
      <section className="student-hero" aria-labelledby="student-hero-title">
        <RouteScene variant="hero" className="student-hero__scene" />
        <div className="student-hero__veil" aria-hidden="true" />

        <div className="student-hero__inner">
          <div className="student-hero__top">
            <BrandLogo
              variant="light"
              size={42}
              tagline={lang === 'kn' ? 'ವಿದ್ಯಾರ್ಥಿ ಆಗಮನ ಭರವಸೆ' : 'Student arrival assurance'}
            />

            <div className="student-hero__actions">
              <span className={`student-conn student-conn--${mode}`}>
                {mode === 'checking' ? (
                  <Loader2 size={12} className="student-spin" aria-hidden="true" />
                ) : mode === 'live' ? (
                  <Wifi size={12} aria-hidden="true" />
                ) : (
                  <WifiOff size={12} aria-hidden="true" />
                )}
                {modeLabel}
              </span>
              <button
                type="button"
                className="student-ghost-button"
                onClick={replayIntro}
              >
                <RotateCcw size={12} aria-hidden="true" />
                {t.page.replayIntro}
              </button>
              <button
                type="button"
                className="student-lang-button"
                onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
                aria-label={t.switchLanguageAria}
              >
                {t.switchLanguage}
              </button>
            </div>
          </div>

          <div className="student-hero__copy">
            <p className="student-kicker">
              <span aria-hidden="true" />
              {t.page.kicker}
            </p>
            <h1 className="student-hero__title" id="student-hero-title">
              {t.page.title} <em>{t.page.titleAccent}</em> {t.page.titleTail}
            </h1>
            <p className="student-hero__sub">{t.page.subtitle}</p>

            <div className="student-hero__badges">
              <DemoBadge label={t.demo} />
              <span className="student-hero__badge">
                <Clock3 size={12} aria-hidden="true" />
                {msgs.classDeadline} · 09:00
              </span>
              <span className="student-hero__badge">
                <Route size={12} aria-hidden="true" />
                {t.commute.route}
              </span>
            </div>
          </div>

          <div className="student-hero__strip">
            <div className="student-hero__stat">
              <span>{t.commute.village}</span>
              <strong>{village.name}</strong>
            </div>
            <div className="student-hero__stat">
              <span>{t.commute.college}</span>
              <strong>Demo District College</strong>
            </div>
            <div className="student-hero__stat">
              <span>{msgs.mode}</span>
              <strong>{modeSub}</strong>
            </div>
          </div>
        </div>
      </section>

      {mode === 'checking' ? (
        <div className="student-mode-banner" role="status">
          <Loader2 size={16} className="student-spin" aria-hidden="true" />
          <div>
            <strong>{msgs.connecting}</strong>
          </div>
        </div>
      ) : mode === 'preview' ? (
        <div className="student-mode-banner" role="status">
          <WifiOff size={16} aria-hidden="true" />
          <div>
            <strong>{msgs.previewMode}</strong>
            <span>{msgs.previewNote}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleRetryLive();
            }}
          >
            {msgs.retry}
          </button>
        </div>
      ) : (
        <div className="student-mode-banner student-mode-banner--live" role="status">
          <Wifi size={16} aria-hidden="true" />
          <div>
            <strong>{msgs.liveBackend}</strong>
            <span>{msgs.liveNote}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleRefreshLive();
            }}
          >
            {msgs.refresh}
          </button>
        </div>
      )}

      <div className="student-grid">
        <section className="student-panel" aria-labelledby="student-commute-title">
          <div className="student-panel__head">
            <div>
              <p className="student-step">{t.commute.step}</p>
              <h2 className="student-panel__title" id="student-commute-title">
                {t.commute.title}
              </h2>
              <p className="student-panel__sub">{t.commute.subtitle}</p>
            </div>
            {mode === 'live' ? (
              <button
                type="button"
                className="student-icon-button"
                onClick={() => {
                  void handleRefreshLive();
                }}
                aria-label={msgs.refresh}
                disabled={busy}
              >
                <RefreshCw
                  size={15}
                  className={busy ? 'student-spin' : undefined}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>

          <div className="student-field">
            <p className="student-field__label">
              <MapPin size={11} aria-hidden="true" />
              {t.commute.village}
            </p>
            <div
              className="student-villages"
              role="group"
              aria-label={t.commute.village}
            >
              {villageList.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="student-village"
                  aria-pressed={option.id === villageId}
                  onClick={() => setVillageId(option.id)}
                >
                  {option.name}
                  <small>{option.corridor_id}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="student-route-line">
            <MapPin size={12} aria-hidden="true" />
            <strong>{village.name}</strong>
            <ArrowRight size={12} aria-hidden="true" />
            <Landmark size={12} aria-hidden="true" />
            <span>
              {t.commute.college} · Demo District College
            </span>
          </div>

          <p className="student-field__label">
            <BusFront size={11} aria-hidden="true" />
            {t.commute.bus}
          </p>

          {selectedBus ? (
            <article className="student-bus">
              <div className="student-bus__head">
                <div>
                  <span className="student-bus__id">
                    <Route size={11} aria-hidden="true" />
                    {t.commute.route} · {selectedBus.id}
                  </span>
                  <h3 className="student-bus__label">{selectedBus.label}</h3>
                </div>
                <StatusChip status={busStatus} dot />
              </div>

              <div className="student-bus__times">
                <div className="student-time">
                  <span>
                    <MapPin size={10} aria-hidden="true" />
                    {t.commute.pickup}
                  </span>
                  <strong>{formatTime(selectedBus.departure_min)}</strong>
                </div>
                <div className="student-time">
                  <span>
                    <Clock3 size={10} aria-hidden="true" />
                    {t.commute.arrives}
                  </span>
                  <strong>{formatTime(selectedBus.arrival_min)}</strong>
                  {onTime ? <small>{msgs.beforeClass}</small> : null}
                </div>
                <div className="student-time">
                  <span>
                    <CalendarClock size={10} aria-hidden="true" />
                    {t.commute.class}
                  </span>
                  <strong>{formatTime(DEMO_CLASS_START_MIN)}</strong>
                </div>
              </div>

              <div className="student-seatline">
                <span>
                  <Users size={11} aria-hidden="true" />{' '}
                  {selectedBus.occupied_seats} {msgs.of} {selectedBus.capacity}{' '}
                  {msgs.seats}
                </span>
                <span>
                  <strong>
                    {freeSeats} {msgs.free}
                  </strong>
                </span>
              </div>
              <div
                className="student-seatbar"
                role="img"
                aria-label={`${selectedBus.occupied_seats} ${msgs.of} ${selectedBus.capacity} ${msgs.seats}`}
              >
                <i style={{ width: `${occupancy}%` }} />
              </div>

              <div className="student-bus__facts">
                {selectedBus.accessible ? (
                  <span className="student-fact">
                    <Accessibility size={11} aria-hidden="true" />
                    {msgs.accessible}
                  </span>
                ) : null}
                {selectedBus.verified ? (
                  <span className="student-fact">
                    <ShieldCheck size={11} aria-hidden="true" />
                    {t.commute.verified}
                  </span>
                ) : null}
                <span className="student-fact">
                  <BusFront size={11} aria-hidden="true" />
                  {selectedBus.kind === 'government_bus'
                    ? msgs.transport
                    : msgs.verifiedBackup}
                </span>
              </div>

              {selectedBus.driver_name ? (
                <div className="student-driver">
                  <span>
                    {msgs.driver}: <strong>{selectedBus.driver_name}</strong>
                  </span>
                  {selectedBus.contact ? (
                    <a href={`tel:${selectedBus.contact}`}>
                      <Phone size={10} aria-hidden="true" />
                      {selectedBus.contact}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </article>
          ) : (
            <EmptyState
              tone="danger"
              icon={<BusFront size={20} />}
              title={t.commute.noBus}
              description={t.commute.noBusBody}
            />
          )}

          {stage !== 'idle' ? (
            <p className="student-alert">
              <AlertTriangle size={14} aria-hidden="true" />
              {incidentConfirmed ? t.commute.verifiedBody : t.commute.disruptionBody}
            </p>
          ) : null}

          <div className="student-demand">
            <div>
              <p className="student-field__label">{t.commute.demand}</p>
              <CrowdingChip
                level={crowding.level}
                label={crowdingLabel}
                detail={crowdingDetail}
              />
            </div>
            <span className="student-demand__note">{t.commute.notLive}</span>
          </div>

          <button
            type="button"
            className="student-report-cta"
            onClick={() => setReportOpen(true)}
            disabled={busy || mode === 'checking'}
          >
            <span>
              <strong>
                {stage === 'idle' ? t.commute.report : t.commute.reportAgain}
              </strong>
              <small>{t.commute.reportHint}</small>
            </span>
            <span className="student-report-cta__icon" aria-hidden="true">
              {busy ? (
                <Loader2 size={18} className="student-spin" />
              ) : (
                <Megaphone size={18} />
              )}
            </span>
          </button>
        </section>
        <section
          className="student-panel student-recovery"
          aria-labelledby="student-recovery-title"
        >
          <div className="student-panel__head">
            <div>
              <p className="student-step">{t.recovery.step}</p>
              <h2 className="student-panel__title" id="student-recovery-title">
                {t.recovery.title}
              </h2>
            </div>
            <StatusChip
              status={stage === 'idle' ? 'demo' : stage}
              label={t.status[stage]}
              dot={stage === 'reported' || stage === 'proposed'}
            />
          </div>

          <StatusTimeline stage={stage} />

          {stage === 'proposed' && proposal && backup ? (
            <AssignmentCard
              proposal={proposal}
              status="proposed"
              transport={backup}
              villageName={village.name}
              classStartMin={DEMO_CLASS_START_MIN}
            />
          ) : stage === 'confirmed' && proposal && backup ? (
            <AssignmentCard
              proposal={proposal}
              status="confirmed"
              transport={backup}
              villageName={village.name}
              classStartMin={DEMO_CLASS_START_MIN}
            />
          ) : stage === 'unserved' ? (
            <EmptyState
              tone="danger"
              icon={<AlertTriangle size={20} />}
              eyebrow={t.status.unserved}
              title={stageTitle.unserved}
              description={unservedExplanation}
              action={
                <button
                  type="button"
                  className="student-button student-button--amber"
                  onClick={() => {
                    void requestEscalation();
                  }}
                  disabled={busy}
                >
                  <LifeBuoy size={14} aria-hidden="true" />
                  {t.recovery.escalate}
                </button>
              }
              footer={<span>{t.recovery.noSms}</span>}
            />
          ) : stage === 'escalated' ? (
            <EmptyState
              tone="info"
              icon={<LifeBuoy size={20} />}
              eyebrow={t.status.escalated}
              title={stageTitle.escalated}
              description={stageBody.escalated}
              footer={<span>{t.recovery.noSms}</span>}
            />
          ) : stage === 'idle' ? (
            <EmptyState
              icon={<HelpCircle size={20} />}
              title={stageTitle.idle}
              description={stageBody.idle}
              footer={
                <div>
                  <p className="student-field__label">{msgs.next}</p>
                  <ol className="student-next">
                    {t.recovery.nextSteps.map((step, index) => (
                      <li key={step}>
                        <span>{index + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              }
            />
          ) : (
            <div
              className={`student-stage student-stage--${
                stage === 'reported' ? 'reported' : 'verified'
              }`}
            >
              <div className="student-stage__head">
                <span className="student-stage__icon" aria-hidden="true">
                  {stage === 'reported' ? (
                    <AlertTriangle size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}
                </span>
                <StatusChip status={stage} label={t.status[stage]} />
              </div>
              <h3>{stageTitle[stage]}</h3>
              <p>{stageBody[stage]}</p>
              <p className="student-stage__note">
                <Clock3 size={12} aria-hidden="true" />
                {stage === 'reported'
                  ? t.recovery.seated
                  : t.recovery.draftNote}
              </p>
              <div>
                <p className="student-field__label">{msgs.next}</p>
                <ol className="student-next">
                  {t.recovery.nextSteps.map((step, index) => (
                    <li key={step}>
                      <span>{index + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {stage !== 'idle' ? (
            <div className="student-report-summary">
              <div>
                <p>{t.recovery.reportSummary}</p>
                <strong>
                  {displayIssue
                    ? t.report.issues[displayIssue]
                    : t.recovery.reportedTitle}
                </strong>
                <small>{displayDetails || msgs.detailsFallback}</small>
                <small>
                  {msgs.requestId}:{' '}
                  {mode === 'live' ? liveRequest?.id ?? '—' : DEMO_REQUEST_ID}
                </small>
              </div>
              <StatusChip
                status={incidentConfirmed ? 'verified' : 'reported'}
              />
            </div>
          ) : null}

          {syncError || sse.status === 'error' ? (
            <p className="student-alert" role="status">
              <WifiOff size={14} aria-hidden="true" />
              {syncError ?? msgs.syncPaused}
              <button
                type="button"
                onClick={() => {
                  setSyncError(null);
                  void handleRefreshLive();
                }}
              >
                {msgs.refresh}
              </button>
            </p>
          ) : null}
        </section>
      </div>

      <footer className="student-footer">
        <p>
          <FlaskConical size={13} aria-hidden="true" />
          {t.footer.data}
        </p>
        <button
          type="button"
          className="student-footer__replay"
          onClick={replayIntro}
        >
          <RotateCcw size={12} aria-hidden="true" />
          {t.footer.replay}
        </button>
      </footer>

      <ReportSheet
        open={reportOpen}
        online={mode === 'live'}
        villageName={village.name}
        transportLabel={selectedBus?.label}
        onClose={() => setReportOpen(false)}
        onSubmit={(issue, details) => {
          void handleReport(issue, details);
        }}
      />

      {mode === 'preview' ? (
        <DemoDock
          stage={previewStage}
          onConfirmIncident={handleConfirmIncident}
          onDraftPlan={handleDraftPlan}
          onApprovePlan={handleApprovePlan}
          onForceUnserved={handleForceUnserved}
          onEscalate={requestEscalation}
          onReset={handleResetPreview}
        />
      ) : null}

      {toast ? (
        <div
          className={`student-toast student-toast--${toast.tone}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          {toast.tone === 'success' ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : toast.tone === 'error' ? (
            <AlertTriangle size={16} aria-hidden="true" />
          ) : (
            <Info size={16} aria-hidden="true" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label={msgs.closeToast}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
