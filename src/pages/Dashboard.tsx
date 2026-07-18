import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Dumbbell,
  Flame,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { GoalRing } from '../components/dashboard/GoalRing'
import { WeekStrip } from '../components/dashboard/WeekStrip'
import {
  currentStreak,
  estimateCalories,
  personalRecords,
  startOfWeek,
} from '../utils/calc'
import {
  formatDurationWords,
  formatKg,
  formatKgCompact,
  formatLongDate,
  formatRelativeDay,
  greeting,
  plural,
} from '../utils/format'
import type { WorkoutPlan } from '../types'

/** Odporučí dnešný plán: ten, ktorý sa netrénoval najdlhšie. */
function suggestPlan(data: ReturnType<typeof useApp>['data']): WorkoutPlan | null {
  if (data.plans.length === 0) return null
  const lastTrained = new Map<string, number>()
  for (const s of data.sessions) {
    if (!s.planId) continue
    const t = new Date(s.finishedAt).getTime()
    lastTrained.set(s.planId, Math.max(lastTrained.get(s.planId) ?? 0, t))
  }
  return [...data.plans].sort(
    (a, b) => (lastTrained.get(a.id) ?? 0) - (lastTrained.get(b.id) ?? 0),
  )[0]
}

/** Úvodný onboarding pri úplne prázdnej aplikácii. */
function Onboarding() {
  const { loadDemo, startEmpty } = useApp()
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-lg pt-6 sm:pt-16"
    >
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-accent text-3xl font-black text-bg shadow-[0_8px_32px_-8px_rgba(201,169,106,0.6)]">
          M
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Vitaj v MAX<span className="text-accent">PERFORM</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-ink-dim">
          Tréningový denník pre silu, výkon a konzistentnosť. Všetky dáta zostávajú
          u teba v prehliadači.
        </p>
      </div>

      <div className="space-y-3">
        <Card tone="accent" className="transition-colors hover:border-accent/50">
          <button
            type="button"
            className="flex w-full items-center gap-4 text-left"
            onClick={() => {
              startEmpty()
              navigate('/training/new')
            }}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-bg">
              <Dumbbell className="size-6" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-bold">Začať s vlastným tréningom</span>
              <span className="mt-0.5 block text-sm text-ink-dim">
                Vytvor si prvý tréningový plán od nuly.
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
          </button>
        </Card>
        <Card className="transition-colors hover:border-line-strong">
          <button type="button" className="flex w-full items-center gap-4 text-left" onClick={loadDemo}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-3 text-ink-dim">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-bold">Pozrieť ukážkové dáta</span>
              <span className="mt-0.5 block text-sm text-ink-dim">
                Načítaj ukážkový plán a históriu. Kedykoľvek ich odstrániš v nastaveniach.
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
          </button>
        </Card>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { data, startWorkout } = useApp()
  const navigate = useNavigate()

  const sessions = data.sessions
  const streak = useMemo(() => currentStreak(sessions), [sessions])
  const records = useMemo(() => personalRecords(sessions), [sessions])
  const suggested = useMemo(() => suggestPlan(data), [data])
  const last = sessions[0] ?? null

  const totalCalories = useMemo(
    () => sessions.reduce((sum, s) => sum + estimateCalories(s.durationSec), 0),
    [sessions],
  )

  const monthVolume = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return sessions
      .filter((s) => new Date(s.finishedAt).getTime() >= cutoff)
      .reduce((sum, s) => sum + s.volume, 0)
  }, [sessions])

  const thisWeekCount = useMemo(() => {
    const monday = startOfWeek(new Date()).getTime()
    return sessions.filter((s) => new Date(s.finishedAt).getTime() >= monday).length
  }, [sessions])

  const weeklyGoal = data.prefs.weeklyGoal
  const goalMet = thisWeekCount >= weeklyGoal

  const showOnboarding =
    !data.prefs.onboarded && data.plans.length === 0 && sessions.length === 0 && !data.active

  if (showOnboarding) return <Onboarding />

  const heroAction = () => {
    if (data.active) {
      navigate('/workout')
      return
    }
    if (suggested && startWorkout(suggested.id)) {
      navigate('/workout')
    } else {
      navigate('/training')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hlavička */}
      <p className="text-sm font-medium text-ink-dim">{formatLongDate(new Date())}</p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
        {greeting()}. {streak > 0 ? 'Séria beží – nezastavuj.' : 'Pripravený začať?'}
      </h1>

      {/* Hero: dnešný tréning – dominantné CTA */}
      <Card tone="accent" className="mt-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-hi">
              {data.active ? 'Prebiehajúci tréning' : 'Dnešný tréning'}
            </p>
            {data.active ? (
              <h2 className="mt-2 truncate text-2xl font-bold">{data.active.name}</h2>
            ) : suggested ? (
              <>
                <h2 className="mt-2 truncate text-2xl font-bold">{suggested.name}</h2>
                <p className="mt-1.5 text-sm text-ink-dim">
                  {plural(suggested.exercises.length, 'cvik', 'cviky', 'cvikov')} ·{' '}
                  {plural(
                    suggested.exercises.reduce((n, e) => n + e.sets.length, 0),
                    'séria',
                    'série',
                    'sérií',
                  )}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-bold">Zatiaľ žiadny plán</h2>
                <p className="mt-1.5 text-sm text-ink-dim">
                  Vytvor si prvý tréningový plán a začni budovať progres.
                </p>
              </>
            )}
          </div>
          <Button size="lg" className="shrink-0" onClick={heroAction}>
            <Play className="size-5" aria-hidden />
            {data.active
              ? 'Pokračovať v tréningu'
              : suggested
                ? 'Začať tréning'
                : 'Vytvoriť tréning'}
          </Button>
        </div>
      </Card>

      {/* Týždenný cieľ – hlavný ring + sekundárne metriky rôznej váhy */}
      <Card className="mt-4">
        <div className="flex items-center gap-5 sm:gap-8">
          <GoalRing value={thisWeekCount / weeklyGoal} complete={goalMet}>
            <div className="text-center">
              <div className="tnum text-3xl font-extrabold leading-none">
                {thisWeekCount}
                <span className="text-lg font-semibold text-ink-faint">/{weeklyGoal}</span>
              </div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase leading-tight tracking-wider text-ink-faint">
                tréningy
                <br />
                tento týždeň
              </div>
            </div>
          </GoalRing>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  streak > 0 ? 'bg-accent/15 text-accent-hi' : 'bg-surface-3 text-ink-faint'
                }`}
              >
                <Zap className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="tnum text-xl font-extrabold leading-tight">
                  {plural(streak, 'deň', 'dni', 'dní')}
                </p>
                <p className="truncate text-xs text-ink-dim">
                  {streak > 0 ? 'v aktívnej sérii' : 'Začni dnes'}
                </p>
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-line pt-3.5">
              <div className="flex items-center gap-2">
                <Target className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0">
                  <p className="tnum truncate text-sm font-bold leading-tight">
                    {monthVolume > 0 ? formatKgCompact(monthVolume) : '—'}
                  </p>
                  <p className="text-[10px] text-ink-faint">objem / 30 dní</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0">
                  <p className="tnum truncate text-sm font-bold leading-tight">
                    {totalCalories.toLocaleString('sk-SK')}
                  </p>
                  <p className="text-[10px] text-ink-faint">kalórie (odhad)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Týždeň + posledný tréning */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Tento týždeň</h3>
            <span className="text-xs text-ink-dim">
              {plural(thisWeekCount, 'tréning', 'tréningy', 'tréningov')}
            </span>
          </div>
          <WeekStrip sessions={sessions} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Posledný tréning</h3>
            {last && (
              <Link
                to={`/history/${last.id}`}
                className="text-xs font-semibold text-accent-hi hover:underline"
              >
                Detail
              </Link>
            )}
          </div>
          {last ? (
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-dim">
                <Dumbbell className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{last.name}</p>
                <p className="mt-0.5 text-xs text-ink-dim">
                  {formatRelativeDay(last.finishedAt)} · {formatDurationWords(last.durationSec)} ·{' '}
                  {formatKg(last.volume)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-dim">
              Zatiaľ žiadny dokončený tréning. Prvý krok je najdôležitejší.
            </p>
          )}
        </Card>
      </div>

      {/* Ďalší krok / rekord */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Trophy className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold">Osobný rekord</h3>
              {records[0] ? (
                <p className="mt-1 text-sm text-ink-dim">
                  <span className="font-semibold text-ink">{records[0].exercise}</span> ·{' '}
                  <span className="tnum">{formatKg(records[0].weight)}</span> ×{' '}
                  {records[0].reps}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-dim">
                  Prvé rekordy prídu s prvými dokončenými sériami.
                </p>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-hi">
              <Target className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold">Ďalší krok</h3>
              <p className="mt-1 text-sm text-ink-dim">
                {thisWeekCount === 0
                  ? 'Tento týždeň ešte nemáš tréning. Dnes je dobrý deň začať.'
                  : !goalMet
                    ? `Máš ${plural(thisWeekCount, 'tréning', 'tréningy', 'tréningov')}. Cieľ: ${weeklyGoal} do konca týždňa.`
                    : 'Týždenný cieľ splnený. Mysli aj na regeneráciu.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
