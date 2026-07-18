import { useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Pause, Play, Plus, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react'
import { useTimer } from '../state/TimerContext'
import { Button } from '../components/ui/Button'
import { NumberField } from '../components/ui/NumberField'
import { formatDuration } from '../utils/format'

const PRESETS = [30, 60, 90, 120]

/** Stránka časovača odpočinku s predvoľbami a veľkým kruhovým odpočtom. */
export default function TimerPage() {
  const timer = useTimer()
  const [customSec, setCustomSec] = useState(75)

  const progress = timer.totalSec > 0 ? timer.remaining / timer.totalSec : 0
  const R = 88
  const CIRC = 2 * Math.PI * R

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Časovač odpočinku</h1>
          <p className="mt-1 text-sm text-ink-dim">Prestávky medzi sériami pod kontrolou.</p>
        </div>
        <button
          type="button"
          aria-label={timer.soundOn ? 'Vypnúť zvuk' : 'Zapnúť zvuk'}
          onClick={() => timer.setSoundOn(!timer.soundOn)}
          className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-ink-dim hover:text-ink"
        >
          {timer.soundOn ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Kruhový odpočet */}
      <div className="relative mx-auto my-6 flex size-56 items-center justify-center">
        <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--color-line)" strokeWidth="10" />
          <motion.circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={timer.finishedFlash ? 'var(--color-success)' : 'var(--color-accent)'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            animate={{ strokeDashoffset: CIRC * (1 - progress) }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </svg>
        <div className="text-center" role="timer" aria-live="polite">
          <div className={`tnum text-5xl font-extrabold ${timer.finishedFlash ? 'text-success' : ''}`}>
            {formatDuration(timer.remaining)}
          </div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            {timer.finishedFlash
              ? 'Hotovo – pokračuj!'
              : timer.running
                ? 'Odpočívaš'
                : timer.activeTimer
                  ? 'Pozastavené'
                  : 'Pripravený'}
          </div>
        </div>
      </div>

      {/* Ovládanie bežiaceho časovača */}
      {timer.activeTimer ? (
        <div className="space-y-3">
          <div className="flex justify-center gap-3">
            <Button variant="secondary" size="lg" onClick={() => timer.addTime(-15)} aria-label="Odobrať 15 sekúnd">
              <Minus className="size-4" aria-hidden /> 15 s
            </Button>
            <Button
              size="lg"
              className="min-w-36"
              onClick={timer.running ? timer.pause : timer.resume}
            >
              {timer.running ? (
                <>
                  <Pause className="size-5" aria-hidden /> Pozastaviť
                </>
              ) : (
                <>
                  <Play className="size-5" aria-hidden /> Pokračovať
                </>
              )}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => timer.addTime(15)} aria-label="Pridať 15 sekúnd">
              <Plus className="size-4" aria-hidden /> 15 s
            </Button>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="ghost" onClick={timer.reset}>
              <RotateCcw className="size-4" aria-hidden /> Reset
            </Button>
            <Button variant="ghost" onClick={timer.stop}>
              <Square className="size-4" aria-hidden /> Ukončiť
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Predvoľby */}
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => timer.start(sec)}
                className="tnum h-14 rounded-xl border border-line bg-surface text-base font-bold text-ink transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-accent-hi"
              >
                {sec} s
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <NumberField
                label="Vlastný čas (sekundy)"
                value={customSec}
                onChange={setCustomSec}
                min={5}
                max={600}
                step={5}
                suffix="s"
              />
            </div>
            <Button size="md" className="h-11" onClick={() => timer.start(customSec)}>
              <Play className="size-4" aria-hidden /> Spustiť
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
