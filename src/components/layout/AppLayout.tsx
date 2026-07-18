import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChartLine,
  Dumbbell,
  History,
  LayoutDashboard,
  Settings,
  Timer,
  Trophy,
} from 'lucide-react'
import { Logo } from './Logo'
import { RestTimerBar } from '../timer/RestTimerBar'
import { ActiveWorkoutBar } from '../workout/ActiveWorkoutBar'

const NAV = [
  { to: '/', label: 'Prehľad', icon: LayoutDashboard, end: true },
  { to: '/training', label: 'Tréning', icon: Dumbbell, end: false },
  { to: '/history', label: 'História', icon: History, end: false },
  { to: '/progress', label: 'Progres', icon: ChartLine, end: false },
  { to: '/records', label: 'Rekordy', icon: Trophy, end: false },
]

const SECONDARY = [
  { to: '/timer', label: 'Časovač', icon: Timer },
  { to: '/settings', label: 'Nastavenia', icon: Settings },
]

/**
 * Hlavný layout: na mobile spodná navigácia + horná lišta,
 * na desktope (lg+) bočný panel.
 */
export function AppLayout() {
  const location = useLocation()
  const onWorkout = location.pathname.startsWith('/workout')

  return (
    <div className="min-h-dvh lg:flex">
      {/* Bočný panel – desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <NavLink to="/" className="mb-8 block px-2" aria-label="MAXPERFORM – prehľad">
          <Logo />
        </NavLink>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Hlavná navigácia">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-accent/12 text-accent-hi'
                    : 'text-ink-dim hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
          <div className="my-3 border-t border-line" />
          {SECONDARY.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-accent/12 text-accent-hi'
                    : 'text-ink-dim hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-2 text-[11px] leading-relaxed text-ink-faint">
          MPM™ · Max Perform Method
        </p>
      </aside>

      {/* Horná lišta – mobil */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-md lg:hidden">
        <NavLink to="/" aria-label="MAXPERFORM – prehľad">
          <Logo />
        </NavLink>
        <div className="flex items-center gap-1">
          {SECONDARY.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `flex size-10 items-center justify-center rounded-xl transition-colors ${
                  isActive ? 'bg-accent/12 text-accent-hi' : 'text-ink-dim hover:text-ink'
                }`
              }
            >
              <Icon className="size-5" aria-hidden />
            </NavLink>
          ))}
        </div>
      </header>

      {/* Obsah */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 sm:px-6 lg:ml-60 lg:px-10 lg:pb-16 lg:pt-8">
        <Outlet />
      </main>

      {/* Plávajúce panely nad spodnou navigáciou */}
      {!onWorkout && <ActiveWorkoutBar />}
      <RestTimerBar />

      {/* Spodná navigácia – mobil */}
      <nav
        aria-label="Hlavná navigácia"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/92 backdrop-blur-md pb-safe lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-accent-hi' : 'text-ink-faint hover:text-ink-dim'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-accent/15' : ''
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="max-w-full truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
