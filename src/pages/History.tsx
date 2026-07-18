import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Dumbbell } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { dayKey, formatDurationWords, formatKg, formatRelativeDay, formatTime, plural } from '../utils/format'

const DAY_LABELS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

function monthLabel(d: Date): string {
  const s = d.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** História tréningov: mesačný kalendár + zoznam. */
export default function History() {
  const { data } = useApp()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const trainedDays = useMemo(
    () => new Set(data.sessions.map((s) => dayKey(s.finishedAt))),
    [data.sessions],
  )

  // Bunky kalendára: prázdne pred 1. dňom + dni mesiaca.
  const cells = useMemo(() => {
    const firstWeekday = (month.getDay() + 6) % 7 // 0 = pondelok
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const out: (Date | null)[] = Array.from({ length: firstWeekday }, () => null)
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(new Date(month.getFullYear(), month.getMonth(), d))
    }
    return out
  }, [month])

  const todayKey = dayKey(new Date())

  const visibleSessions = useMemo(() => {
    if (!selectedDay) return data.sessions
    return data.sessions.filter((s) => dayKey(s.finishedAt) === selectedDay)
  }, [data.sessions, selectedDay])

  const shiftMonth = (delta: number) => {
    setMonth((m) => {
      const next = new Date(m)
      next.setMonth(m.getMonth() + delta)
      return next
    })
    setSelectedDay(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h1 className="text-2xl font-bold tracking-tight">História tréningov</h1>
      <p className="mt-1 text-sm text-ink-dim">
        {plural(data.sessions.length, 'dokončený tréning', 'dokončené tréningy', 'dokončených tréningov')}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
        {/* Kalendár */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Predchádzajúci mesiac"
              onClick={() => shiftMonth(-1)}
              className="flex size-9 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-3 hover:text-ink"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <h2 className="text-sm font-bold">{monthLabel(month)}</h2>
            <button
              type="button"
              aria-label="Nasledujúci mesiac"
              onClick={() => shiftMonth(1)}
              className="flex size-9 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-3 hover:text-ink"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_LABELS.map((d) => (
              <span key={d} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                {d}
              </span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <span key={`e-${i}`} />
              const key = dayKey(date)
              const trained = trainedDays.has(key)
              const isToday = key === todayKey
              const isSelected = key === selectedDay
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`${date.getDate()}. ${monthLabel(month).toLowerCase()}${trained ? ' – trénované' : ''}`}
                  aria-pressed={isSelected}
                  disabled={!trained}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`tnum mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'bg-accent text-bg'
                      : trained
                        ? 'bg-success/15 text-success hover:bg-success/25'
                        : isToday
                          ? 'border border-dashed border-accent/50 text-ink-dim'
                          : 'text-ink-faint'
                  } ${trained ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
          {selectedDay && (
            <div className="mt-3 border-t border-line pt-3 text-center">
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                Zrušiť filter dňa
              </Button>
            </div>
          )}
        </Card>

        {/* Zoznam */}
        <div className="space-y-3">
          {visibleSessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={selectedDay ? 'V tento deň nič nie je' : 'Zatiaľ prázdna história'}
              message={
                selectedDay
                  ? 'Vyber v kalendári iný zvýraznený deň.'
                  : 'Každý dokončený tréning sa uloží sem – vrátane sérií, opakovaní a váh.'
              }
            />
          ) : (
            visibleSessions.map((s) => (
              <Link key={s.id} to={`/history/${s.id}`} className="block">
                <Card className="transition-colors hover:border-line-strong">
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-dim">
                      <Dumbbell className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold">
                        {s.name}
                        {s.isDemo && (
                          <span className="ml-2 rounded-md bg-warning/15 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-warning">
                            Demo
                          </span>
                        )}
                      </h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-dim">
                        <span>
                          {formatRelativeDay(s.finishedAt)} · {formatTime(s.startedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" aria-hidden />
                          {formatDurationWords(s.durationSec)}
                        </span>
                        <span className="tnum">{formatKg(s.volume)}</span>
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-ink-faint" aria-hidden />
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
