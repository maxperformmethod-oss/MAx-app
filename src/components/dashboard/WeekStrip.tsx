import { Check } from 'lucide-react'
import { weekConsistency } from '../../utils/calc'
import { dayKey } from '../../utils/format'
import type { WorkoutSession } from '../../types'

const DAY_LABELS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

/** Týždenná konzistentnosť – 7 dní aktuálneho týždňa. */
export function WeekStrip({ sessions }: { sessions: WorkoutSession[] }) {
  const week = weekConsistency(sessions)
  const todayKey = dayKey(new Date())

  return (
    <div className="flex items-center justify-between gap-1">
      {week.map(({ date, trained }, i) => {
        const isToday = dayKey(date) === todayKey
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={`text-[10px] font-semibold uppercase ${
                isToday ? 'text-accent-hi' : 'text-ink-faint'
              }`}
            >
              {DAY_LABELS[i]}
            </span>
            <span
              className={`flex size-8 items-center justify-center rounded-full border text-[11px] font-bold ${
                trained
                  ? 'border-success/40 bg-success/15 text-success'
                  : isToday
                    ? 'border-accent/50 border-dashed text-ink-dim'
                    : 'border-line text-ink-faint'
              }`}
              aria-label={`${DAY_LABELS[i]}${trained ? ' – trénované' : ''}`}
            >
              {trained ? <Check className="size-3.5" aria-hidden /> : date.getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
