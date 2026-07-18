import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useApp } from '../../state/AppContext'
import { activeProgress } from '../../utils/calc'

/** Pripomienka rozbehnutého tréningu – jeden klik a používateľ je späť. */
export function ActiveWorkoutBar() {
  const { data } = useApp()
  const navigate = useNavigate()
  const active = data.active

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2 lg:bottom-4 lg:left-60"
        >
          <button
            type="button"
            onClick={() => navigate('/workout')}
            className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-accent/40 bg-accent/15 px-4 py-3 text-left shadow-xl shadow-black/50 backdrop-blur-md transition-colors hover:bg-accent/25"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-bg">
              <Play className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-accent-hi">
                Prebieha tréning · {Math.round(activeProgress(active) * 100)} %
              </span>
              <span className="block truncate text-sm font-bold">{active.name}</span>
            </span>
            <span className="text-xs font-semibold text-accent-hi">Pokračovať</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
