import { useState } from 'react';
import { StudentHome } from './pages/StudentHome';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { DemoBadge } from './components/DemoBadge';

export default function App() {
  const [role, setRole] = useState<'student' | 'coordinator'>('student');

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-teal-800">ROUTELESS</h1>
            <DemoBadge />
          </div>

          <div className="inline-flex rounded-lg border border-stone-200 p-1 bg-stone-100">
            <button
              onClick={() => setRole('student')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                role === 'student' ? 'bg-white shadow text-teal-900' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Student View
            </button>
            <button
              onClick={() => setRole('coordinator')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                role === 'coordinator' ? 'bg-white shadow text-teal-900' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Coordinator Mode
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {role === 'student' ? <StudentHome /> : <CoordinatorDashboard />}
      </main>

      <footer className="bg-white border-t border-stone-200 py-3 text-center text-xs text-stone-500">
        Demo scenario clock: 08:00 AM · Target Arrival: 09:00 AM · Aerophilia 2K26
      </footer>
    </div>
  );
}
