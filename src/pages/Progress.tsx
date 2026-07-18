import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartLine, Trophy } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from '../components/charts/chartTheme'
import { MAX_COMPARE_EXERCISES, SERIES_COLORS } from '../components/charts/chartColors'
import { epley1RM, personalRecords, startOfWeek, volumeByMuscleGroup } from '../utils/calc'
import { formatDate, formatKg, plural } from '../utils/format'
import { MUSCLE_GROUP_LABELS, UNASSIGNED_MUSCLE_GROUP_LABEL } from '../types'
import type { WorkoutSession } from '../types'

const PERIODS = [
  { key: '30', label: '30 dní', days: 30 },
  { key: '90', label: '90 dní', days: 90 },
  { key: '365', label: 'Rok', days: 365 },
  { key: 'all', label: 'Všetko', days: Infinity },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']
type Metric = 'weight' | '1rm'

function filterByPeriod(sessions: WorkoutSession[], days: number): WorkoutSession[] {
  if (!Number.isFinite(days)) return sessions
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return sessions.filter((s) => new Date(s.finishedAt).getTime() >= cutoff)
}

/** Krátky popis týždňa: „13. 7." (pondelok). */
function weekLabel(monday: Date): string {
  return monday.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })
}

export default function Progress() {
  const { data } = useApp()
  const [period, setPeriod] = useState<PeriodKey>('90')
  const [metric, setMetric] = useState<Metric>('weight')

  const exerciseNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of data.sessions) {
      for (const ex of s.exercises) {
        counts.set(ex.name, (counts.get(ex.name) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [data.sessions])

  const [selected, setSelected] = useState<string[]>([])
  const selectedExercises = selected.length > 0 ? selected : exerciseNames.slice(0, 1)

  const toggleExercise = (name: string) => {
    setSelected((prev) => {
      const base = prev.length > 0 ? prev : exerciseNames.slice(0, 1)
      if (base.includes(name)) return base.filter((n) => n !== name)
      if (base.length >= MAX_COMPARE_EXERCISES) return base
      return [...base, name]
    })
  }

  const periodDays = PERIODS.find((p) => p.key === period)?.days ?? 90
  const filtered = useMemo(
    () => filterByPeriod(data.sessions, periodDays),
    [data.sessions, periodDays],
  )

  /* Progres hmotnosti / odhadu 1RM pre 1–3 vybrané cviky, zlúčené podľa dátumu tréningu. */
  const compareSeries = useMemo(() => {
    const points = new Map<string, { label: string; sortKey: number } & Record<string, number | string>>()
    for (const s of filtered) {
      for (const exName of selectedExercises) {
        const ex = s.exercises.find((e) => e.name === exName)
        if (!ex) continue
        const best = ex.sets.reduce(
          (acc, set) => {
            if (set.weight <= 0) return acc
            const value = metric === '1rm' ? epley1RM(set.weight, set.reps) : set.weight
            return value > acc ? value : acc
          },
          0,
        )
        if (best <= 0) continue
        const key = s.finishedAt.slice(0, 10)
        const point = points.get(key) ?? {
          label: formatDate(s.finishedAt),
          sortKey: new Date(s.finishedAt).getTime(),
        }
        point[exName] = Math.round(best * 10) / 10
        points.set(key, point)
      }
    }
    return [...points.values()].sort((a, b) => a.sortKey - b.sortKey)
  }, [filtered, selectedExercises, metric])

  const hasEnoughData = selectedExercises.some(
    (name) => compareSeries.filter((p) => typeof p[name] === 'number').length >= 2,
  )

  /* Objem po týždňoch. */
  const volumeByWeek = useMemo(() => {
    const map = new Map<number, number>()
    for (const s of filtered) {
      const monday = startOfWeek(new Date(s.finishedAt)).getTime()
      map.set(monday, (map.get(monday) ?? 0) + s.volume)
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([monday, volume]) => ({ label: weekLabel(new Date(monday)), volume }))
  }, [filtered])

  /* Počet tréningov po týždňoch. */
  const countByWeek = useMemo(() => {
    const map = new Map<number, number>()
    for (const s of filtered) {
      const monday = startOfWeek(new Date(s.finishedAt)).getTime()
      map.set(monday, (map.get(monday) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([monday, count]) => ({ label: weekLabel(new Date(monday)), count }))
  }, [filtered])

  /* Konzistentnosť: podiel týždňov s aspoň 2 tréningami. */
  const consistency = useMemo(() => {
    if (countByWeek.length === 0) return null
    const good = countByWeek.filter((w) => w.count >= 2).length
    return Math.round((good / countByWeek.length) * 100)
  }, [countByWeek])

  /* Najčastejšie cviky. */
  const topExercises = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of filtered) {
      for (const ex of s.exercises) {
        counts.set(ex.name, (counts.get(ex.name) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [filtered])

  /* Objem podľa svalovej partie vo zvolenom období. */
  const muscleVolume = useMemo(
    () =>
      volumeByMuscleGroup(filtered).map((row) => ({
        label:
          row.group === 'nezaradene' ? UNASSIGNED_MUSCLE_GROUP_LABEL : MUSCLE_GROUP_LABELS[row.group],
        volume: Math.round(row.volume),
      })),
    [filtered],
  )

  const records = useMemo(() => personalRecords(data.sessions).slice(0, 6), [data.sessions])

  if (data.sessions.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progres</h1>
        <div className="mt-6">
          <EmptyState
            icon={ChartLine}
            title="Zatiaľ žiadne dáta"
            message="Grafy sa objavia po prvom dokončenom tréningu. Každá séria sa počíta."
          />
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progres</h1>
          <p className="mt-1 text-sm text-ink-dim">
            {plural(filtered.length, 'tréning', 'tréningy', 'tréningov')} vo zvolenom období
          </p>
        </div>
        {/* Obdobie */}
        <div className="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Časové obdobie">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
                period === p.key ? 'bg-accent text-bg' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progres hmotnosti / 1RM – porovnanie viacerých cvikov */}
      <Card className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Progres cvikov</h2>
          <div className="flex rounded-xl border border-line bg-surface-3 p-1" role="group" aria-label="Zobrazovaná metrika">
            <button
              type="button"
              aria-pressed={metric === 'weight'}
              onClick={() => setMetric('weight')}
              className={`h-8 rounded-lg px-2.5 text-xs font-bold transition-colors ${
                metric === 'weight' ? 'bg-accent text-bg' : 'text-ink-dim hover:text-ink'
              }`}
            >
              Max váha
            </button>
            <button
              type="button"
              aria-pressed={metric === '1rm'}
              onClick={() => setMetric('1rm')}
              className={`h-8 rounded-lg px-2.5 text-xs font-bold transition-colors ${
                metric === '1rm' ? 'bg-accent text-bg' : 'text-ink-dim hover:text-ink'
              }`}
            >
              Odhad 1RM
            </button>
          </div>
        </div>

        {/* Výber cvikov na porovnanie (max 3) */}
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Vybrané cviky na porovnanie">
          {exerciseNames.map((name) => {
            const idx = selectedExercises.indexOf(name)
            const active = idx !== -1
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => toggleExercise(name)}
                disabled={!active && selectedExercises.length >= MAX_COMPARE_EXERCISES}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  active
                    ? 'border-transparent text-bg'
                    : 'border-line-strong bg-surface-3 text-ink-dim hover:text-ink'
                }`}
                style={active ? { backgroundColor: SERIES_COLORS[idx] } : undefined}
              >
                {name}
              </button>
            )
          })}
        </div>
        {selectedExercises.length >= MAX_COMPARE_EXERCISES && (
          <p className="-mt-2 mb-3 text-[11px] text-ink-faint">
            Naraz je možné porovnať najviac {MAX_COMPARE_EXERCISES} cviky.
          </p>
        )}

        {metric === '1rm' && (
          <p className="mb-3 rounded-lg bg-surface-3 px-3 py-2 text-[11px] leading-relaxed text-ink-dim">
            <span className="font-bold text-ink">ODHAD</span> podľa Epleyho vzorca: 1RM = váha ×
            (1 + opakovania / 30). Nejde o zmeraný výkon.
          </p>
        )}

        {hasEnoughData ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compareSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={24} />
                <YAxis {...AXIS_PROPS} width={44} unit=" kg" domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip format={(v) => formatKg(v)} />} cursor={{ stroke: 'var(--color-line-strong)' }} />
                {selectedExercises.length > 1 && (
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'var(--color-ink-dim)' }}
                    formatter={(value: string) => <span style={{ color: 'var(--color-ink-dim)' }}>{value}</span>}
                  />
                )}
                {selectedExercises.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={SERIES_COLORS[i]}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: SERIES_COLORS[i], strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-ink-dim">
            Na graf treba aspoň dva tréningy s vybraným cvikom vo zvolenom období.
          </p>
        )}
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/* Objem po týždňoch */}
        <Card>
          <h2 className="mb-4 text-sm font-bold">Tréningový objem po týždňoch</h2>
          {volumeByWeek.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByWeek} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
                  <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}t` : String(v))} />
                  <Tooltip content={<ChartTooltip format={(v) => formatKg(v)} />} cursor={{ fill: 'var(--color-surface-3)' }} />
                  <Bar dataKey="volume" fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-ink-dim">Žiadne dáta vo zvolenom období.</p>
          )}
        </Card>

        {/* Počet tréningov po týždňoch */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold">Tréningy po týždňoch</h2>
            {consistency !== null && (
              <span className="rounded-lg bg-success/12 px-2 py-1 text-xs font-bold text-success">
                Konzistentnosť {consistency} %
              </span>
            )}
          </div>
          {countByWeek.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countByWeek} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
                  <YAxis {...AXIS_PROPS} width={36} allowDecimals={false} />
                  <Tooltip
                    content={<ChartTooltip format={(v) => plural(v, 'tréning', 'tréningy', 'tréningov')} />}
                    cursor={{ fill: 'var(--color-surface-3)' }}
                  />
                  <Bar dataKey="count" fill="var(--color-success)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-ink-dim">Žiadne dáta vo zvolenom období.</p>
          )}
          <p className="mt-2 text-[11px] text-ink-faint">
            Konzistentnosť = podiel týždňov s aspoň dvoma tréningami.
          </p>
        </Card>
      </div>

      {/* Objem podľa svalovej partie */}
      <Card className="mt-3">
        <h2 className="mb-1 text-sm font-bold">Objem podľa svalovej partie</h2>
        <p className="mb-4 text-[11px] text-ink-faint">
          Cviky bez priradenej partie sa počítajú ako „{UNASSIGNED_MUSCLE_GROUP_LABEL.toLowerCase()}" –
          partiu nastavíš v editore tréningu.
        </p>
        {muscleVolume.length > 0 ? (
          <div style={{ height: Math.max(160, muscleVolume.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={muscleVolume}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}t` : String(v))} />
                <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={100} />
                <Tooltip content={<ChartTooltip format={(v) => formatKg(v)} />} cursor={{ fill: 'var(--color-surface-3)' }} />
                <Bar dataKey="volume" fill="var(--color-accent)" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-ink-dim">Žiadne dáta vo zvolenom období.</p>
        )}
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/* Najčastejšie cviky */}
        <Card>
          <h2 className="mb-3 text-sm font-bold">Najčastejšie cviky</h2>
          {topExercises.length > 0 ? (
            <ul className="space-y-2.5">
              {topExercises.map(([name, count]) => {
                const max = topExercises[0][1]
                return (
                  <li key={name}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{name}</span>
                      <span className="tnum shrink-0 text-xs text-ink-dim">{count}×</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-accent/70"
                        style={{ width: `${Math.round((count / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-ink-dim">Žiadne cviky vo zvolenom období.</p>
          )}
        </Card>

        {/* Osobné rekordy */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Trophy className="size-4 text-warning" aria-hidden />
              Osobné rekordy
            </h2>
            <Link to="/records" className="text-xs font-semibold text-accent-hi hover:underline">
              Všetky
            </Link>
          </div>
          {records.length > 0 ? (
            <ul className="divide-y divide-line">
              {records.map((r) => (
                <li key={r.exercise} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.exercise}</p>
                    <p className="text-[11px] text-ink-faint">{formatDate(r.date)}</p>
                  </div>
                  <span className="tnum shrink-0 font-extrabold text-warning">
                    {formatKg(r.weight)} <span className="font-semibold text-ink-dim">× {r.reps}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-ink-dim">
              Rekordy vznikajú z dokončených sérií s váhou.
            </p>
          )}
          <p className="mt-3 text-[11px] text-ink-faint">
            Rekord = najvyššia hmotnosť dokončenej série daného cviku.
          </p>
        </Card>
      </div>
    </motion.div>
  )
}
