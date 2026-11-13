import { useCallback, useEffect, useState } from 'react';
import { BusFront, GraduationCap, Map, ShieldCheck } from 'lucide-react';
import { StudentHome } from './pages/StudentHome';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { DemoBadge } from './components/DemoBadge';
import { LiveBusTracking } from './features/live-bus-tracking';

type Role = 'student' | 'tracking' | 'coordinator';

const ROLE_BY_HASH: Record<string, Role> = {
  '#/student': 'student',
  '#/tracking': 'tracking',
  '#/coordinator': 'coordinator',
};

function roleFromHash(): Role {
  return ROLE_BY_HASH[window.location.hash] ?? 'student';
}

export default function App() {
  const [role, setRole] = useState<Role>(roleFromHash);

  // Keep the view and the URL hash in sync so a refresh or shared link
  // lands on the same role.
  useEffect(() => {
    const onHashChange = () => setRole(roleFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const target =
      role === 'student'
        ? '#/student'
        : role === 'tracking'
          ? '#/tracking'
          : '#/coordinator';
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [role]);

  const switchRole = useCallback((next: Role) => {
    setRole(next);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 font-sans">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-900 text-teal-50">
              <BusFront size={18} />
            </span>
            <div>
              <h1 className="text-lg font-extrabold leading-none tracking-tight text-teal-900">
                ROUTELESS
              </h1>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                Last-mile recovery
              </p>
            </div>
            <DemoBadge />
          </div>

          <nav
            aria-label="Switch demo role"
            className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-1"
          >
            <button
              type="button"
              onClick={() => switchRole('student')}
              aria-pressed={role === 'student'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                role === 'student'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <GraduationCap size={14} />
              Student
            </button>
            <button
              type="button"
              onClick={() => switchRole('tracking')}
              aria-pressed={role === 'tracking'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                role === 'tracking'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Map size={14} />
              Live bus
            </button>
            <button
              type="button"
              onClick={() => switchRole('coordinator')}
              aria-pressed={role === 'coordinator'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                role === 'coordinator'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShieldCheck size={14} />
              Coordinator
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-3 sm:p-4 md:p-6">
        {role === 'student' ? (
          <StudentHome />
        ) : role === 'tracking' ? (
          <LiveBusTracking />
        ) : (
          <CoordinatorDashboard />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-3 text-center text-[11px] text-stone-500">
        Simulated demo · scenario clock 08:00 · target arrival 09:00 · Aerophilia 2K26
      </footer>
    </div>
  );
}
