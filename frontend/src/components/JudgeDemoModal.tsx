import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Languages,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'student' | 'tracking' | 'coordinator') => void;
}

type Tab = 'tour' | 'script' | 'proof';

interface TourStep {
  step: number;
  badge: string;
  title: string;
  roleTarget: 'student' | 'tracking' | 'coordinator';
  buttonLabel: string;
  context: string;
  systemAction: string;
  keyHonestyPoint: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    badge: 'Commute Signal',
    title: 'Student Commute & 1-Tap Incident Report',
    roleTarget: 'student',
    buttonLabel: 'Open Student View',
    context:
      'Bus B2 serves Village C but broke down at 07:45 AM. Twelve students are stranded with class at 09:00 AM.',
    systemAction:
      'Students report the issue in 1 tap (supports English & Kannada / ಕನ್ನಡ). Shows unverified report state until coordinator confirmation.',
    keyHonestyPoint:
      'Never fabricates immediate fake arrival times; clearly marks state as "Reported — Awaiting Coordinator Confirmation".',
  },
  {
    step: 2,
    badge: 'Corridor Visibility',
    title: 'Live Tracking & Route Corridors',
    roleTarget: 'tracking',
    buttonLabel: 'Open Live Bus Tracking',
    context:
      'Visualizes active transit routes across rural corridors between Village A, B, C and the College.',
    systemAction:
      'Interactive Leaflet map traces real GPS waypoints, corridor segments, pickup stops, and current vehicle positions.',
    keyHonestyPoint:
      'Corridor-level tracking protects student privacy (no individual home tracking; corridor and junction hops only).',
  },
  {
    step: 3,
    badge: 'Triage Room',
    title: 'Coordinator Disruption Overview',
    roleTarget: 'coordinator',
    buttonLabel: 'Open Coordinator Mode',
    context:
      'The school transport coordinator oversees incoming incident signals from rural routes.',
    systemAction:
      'Coordinator views grouped disruption signals, confirms B2 breakdown, and verifies 12 impacted student requests from Village C.',
    keyHonestyPoint:
      'Prevents duplicate requests and requires explicit human coordinator confirmation before triggering backup assets.',
  },
  {
    step: 4,
    badge: 'Deterministic Engine',
    title: 'Allocation Engine & Constraint Solver',
    roleTarget: 'coordinator',
    buttonLabel: 'Run Allocation in Coordinator',
    context:
      'Twelve students need transport. Available backup: Institution Van V1 (8 spare verified seats, arrives at 08:35 AM).',
    systemAction:
      'Deterministic rule engine matches 8 students to Van V1 and leaves exactly 4 unserved. No hallucinations, no seat double-booking.',
    keyHonestyPoint:
      'Math is strictly verified: 12 affected − 8 seats = 4 unserved. Arrives before 09:00 AM class cutoff.',
  },
  {
    step: 5,
    badge: 'Safe Execution',
    title: 'Plan Approval & Transparent Status',
    roleTarget: 'coordinator',
    buttonLabel: 'Approve Plan in Coordinator',
    context:
      'Coordinator reviews the proposed allocation breakdown before locking assignments into SQLite/API.',
    systemAction:
      'Atomic transaction writes assignments and decrements seats once. Real-time SSE updates connected student devices instantly.',
    keyHonestyPoint:
      'The 4 unserved students see an honest "No Confirmed Vehicle" status with a 1-tap School Escalation button.',
  },
  {
    step: 6,
    badge: 'Stress Test Scenarios',
    title: 'Scenarios: Overcrowding & Zero Backup',
    roleTarget: 'coordinator',
    buttonLabel: 'Test Scenarios in Coordinator',
    context:
      'What happens when zero backup vehicles exist, or when corridors are flooded?',
    systemAction:
      'Switch between pre-configured scenarios ("Zero Backup", "Overcrowding", "Bus Breakdown") in one click.',
    keyHonestyPoint:
      'In Zero Backup, the engine outputs 0 assignments and 12 unserved. No magic seats are invented.',
  },
];

export function JudgeDemoModal({ isOpen, onClose, onSelectRole }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('tour');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];

  const handleAction = (role: 'student' | 'tracking' | 'coordinator') => {
    onSelectRole(role);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-800 text-teal-50 shadow-sm">
              <Sparkles size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-900 sm:text-lg">
                  ROUTELESS — Judge Demo & Walkthrough
                </h2>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-bold text-teal-900">
                  Aerophilia 2K26
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Interactive evaluation guide · 90-second showcase · Deterministic recovery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo guide"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-white px-5">
          <button
            type="button"
            onClick={() => setActiveTab('tour')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${
              activeTab === 'tour'
                ? 'border-teal-800 text-teal-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Play size={14} />
            Guided Interactive Tour
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ml-4 sm:ml-6 ${
              activeTab === 'script'
                ? 'border-teal-800 text-teal-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock size={14} />
            90-Second Demo Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('proof')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ml-4 sm:ml-6 ${
              activeTab === 'proof'
                ? 'border-teal-800 text-teal-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldCheck size={14} />
            Engineering & Invariants Proof
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === 'tour' && (
            <div className="space-y-4">
              {/* Step dots */}
              <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Step {currentStep.step} of {TOUR_STEPS.length}
                </span>
                <div className="flex items-center gap-1.5">
                  {TOUR_STEPS.map((s, idx) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        idx === currentStepIndex
                          ? 'w-7 bg-teal-800'
                          : 'w-2.5 bg-stone-300 hover:bg-stone-400'
                      }`}
                      aria-label={`Jump to step ${s.step}`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Step Card */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-950">
                    {currentStep.badge}
                  </span>
                  <span className="text-xs font-semibold text-stone-400">
                    Target View: <strong className="text-stone-700 capitalize">{currentStep.roleTarget}</strong>
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-stone-900 sm:text-lg">
                    {currentStep.title}
                  </h3>
                  <p className="mt-1 text-xs text-stone-600 sm:text-sm">
                    {currentStep.context}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3.5 border border-stone-200/80 shadow-sm space-y-2">
                  <div className="flex items-start gap-2 text-xs text-stone-700 sm:text-sm">
                    <CheckCircle2 size={16} className="text-teal-700 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-stone-900">System Workflow: </strong>
                      {currentStep.systemAction}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <ShieldAlert size={15} className="text-amber-700 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-amber-950">Algorithmic Honesty: </strong>
                      {currentStep.keyHonestyPoint}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => handleAction(currentStep.roleTarget)}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-800 transition-colors"
                  >
                    {currentStep.buttonLabel}
                    <ArrowRight size={14} />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 disabled:opacity-40 hover:bg-stone-100"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentStepIndex === TOUR_STEPS.length - 1}
                      onClick={() =>
                        setCurrentStepIndex((prev) => Math.min(TOUR_STEPS.length - 1, prev + 1))
                      }
                      className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-stone-700"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-teal-50 p-3.5 border border-teal-200 text-teal-900 text-xs sm:text-sm">
                <strong>90-Second Demo Pitch:</strong> Read or follow this live when demonstrating to judges. Every step ties directly to the Aerophilia problem statement and prompt iterations.
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-800">00:00 – 00:15</span>
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">The Problem</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800">
                    "Rural students commute across long corridors to college. Today, regular government bus B2 breaks down at 07:45 AM. Twelve students in Village C have class at 09:00 AM."
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-800">00:15 – 00:35</span>
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">Student Signal (Bilingual)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800">
                    "Open <strong>Student View</strong>. Switch language to <strong>ಕನ್ನಡ (Kannada)</strong>. In one tap, report 'ಬಸ್ ಬರಲಿಲ್ಲ' (Bus not coming). The app immediately shows a clear unconfirmed signal with honest messaging."
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-800">00:35 – 00:55</span>
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">Coordinator Triage</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800">
                    "Switch to <strong>Coordinator Mode</strong>. Confirm the B2 breakdown. The system detects all 12 affected Village C students. Click <strong>Run Recovery Engine</strong>."
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-800">00:55 – 00:75</span>
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">Deterministic Recovery</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800">
                    "Look at the allocation: Verified institution van V1 has 8 seats. The engine proposes exactly <strong>8 assigned, 4 unserved</strong>. Hit <strong>Approve Plan</strong>. The seats are consumed atomically; duplicate bookings are impossible."
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-800">00:75 – 00:90</span>
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">Honesty & Stress Testing</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800">
                    "The 4 unserved students see an honest 'No Confirmed Vehicle' status with school escalation. Then switch scenario to <strong>'Zero Backup'</strong>: 0 assigned, 12 unserved. Zero hallucinations. Real software, real invariants."
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proof' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-stone-900">
                    <CheckCircle2 size={15} className="text-teal-700" />
                    Deterministic Allocation
                  </span>
                  <p className="text-xs text-stone-600">
                    Pure TypeScript recovery heuristic without probabilistic hallucinations. Filters by corridor eligibility, verified vehicle status, arrival before 09:00 AM, and capacity.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-stone-900">
                    <ShieldCheck size={15} className="text-teal-700" />
                    Verified Safety Boundary
                  </span>
                  <p className="text-xs text-stone-600">
                    Matches only verified school vans or designated state transit. Explicitly avoids unvetted ride-pooling or unknown drivers for student safety.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-stone-900">
                    <Languages size={15} className="text-teal-700" />
                    Bilingual Accessibility
                  </span>
                  <p className="text-xs text-stone-600">
                    Full native Kannada (ಕನ್ನಡ) & English translation for rural students. High-contrast, mobile-first design tested at 375px.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-stone-900">
                    <Zap size={15} className="text-teal-700" />
                    Automated Test Suite
                  </span>
                  <p className="text-xs text-stone-600">
                    13 comprehensive Vitest tests verifying zero-backup behavior, seat capacity bounds, route compatibility, and coordinator confirmation gating.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-stone-900 p-4 text-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-emerald-400">✓ Invariant Tests Passed</span>
                  <span className="text-stone-400">vitest run</span>
                </div>
                <pre className="font-mono text-[11px] text-stone-300 overflow-x-auto bg-stone-950 p-2.5 rounded-lg">
                  {`✓ Recovery Engine Invariants (13 tests) 20ms
  ✓ preserves seat limits under heavy demand
  ✓ marks students unserved when capacity exhausted
  ✓ rejects vehicles not serving village corridor
  ✓ handles zero-backup scenario cleanly (0 assigned, 12 unserved)
  ✓ requires coordinator confirmation before allocating`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-stone-200 bg-stone-50 px-5 py-3 gap-2">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Clock size={13} />
            <span>Clock: 08:00 AM · Deadline: 09:00 AM · Aerophilia 2K26</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleAction('coordinator')}
              className="rounded-lg bg-teal-900 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-800"
            >
              Try Coordinator Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
