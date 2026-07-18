import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Pause, Play, Plus, X } from 'lucide-react'
import { useTimer } from '../../state/TimerContext'
import { formatDuration } from '../../utils/format'

/**
 * Plávajúci panel bežiaceho odpočinku – viditeľný v celej aplikácii
 * okrem stránky časovača, aby ovládanie nebolo zdvojené.
 */
export function RestTimerBar() {
  const timer = useTimer()
  const location = useLocation()

  const hidden = location.pathname === '/timer'
  const show = !hidden && (timer.activeTimer || timer.finishedFlash)
  const progress = timer.totalSec > 0 ? timer.remaining / timer.totalSec : 0

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-3 pb-2 lg:bottom-4 lg:left-60"
        >
          <div
            className={`mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 shadow-xl shadow-black/50 backdrop-blur-md ${
              timer.finishedFlash
                ? 'border-success/50 bg-success/15'
                : 'border-line-strong bg-surface-2/95'
            }`}
          >
            <div className="relative flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {timer.finishedFlash ? 'Odpočinok skončil' : 'Odpočinok'}
              </span>
              <span className="tnum text-xl font-extrabold leading-tight">
                {formatDuration(timer.remaining)}
              </span>
              {/* Priebeh */}
              <div className="absolute -bottom-3 left-0 right-0 h-0.5 rounded bg-line">
                <div
                  className="h-full rounded bg-accent transition-[width] duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
            {timer.activeTimer && (
              <>
                <button
                  type="button"
                  aria-label="Pridať 15 sekúnd"
                  onClick={() => timer.addTime(15)}
                  className="flex h-10 items-center gap-0.5 rounded-xl bg-surface-3 px-2.5 text-xs font-bold text-ink-dim hover:text-ink"
                >
                  <Plus className="size-3.5" aria-hidden />
                  15 s
                </button>
                <button
                  type="button"
                  aria-label={timer.running ? 'Pozastaviť odpočinok' : 'Pokračovať v odpočinku'}
                  onClick={timer.running ? timer.pause : timer.resume}
                  className="flex size-10 items-center justify-center rounded-xl bg-accent text-bg hover:bg-accent-hi"
                >
                  {timer.running ? (
                    <Pause className="size-4" aria-hidden />
                  ) : (
                    <Play className="size-4" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Preskočiť odpočinok"
                  onClick={timer.stop}
                  className="flex size-10 items-center justify-center rounded-xl text-ink-dim hover:bg-surface-3 hover:text-ink"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
