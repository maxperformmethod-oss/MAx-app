import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, Flag, StickyNote, X } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { useTimer } from '../state/TimerContext'
import { useToast } from '../state/ToastContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { InlineStepper } from '../components/workout/InlineStepper'
import { activeProgress, previousPerformance } from '../utils/calc'
import { formatDuration, formatKg } from '../utils/format'

/** Uplynutý čas od štartu – tiká každú sekundu. */
function useElapsed(startedAt: string | undefined): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [startedAt])
  if (!startedAt) return 0
  return Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000))
}

/** Zobrazenie práve prebiehajúceho tréningu. */
export default function WorkoutActive() {
  const { data, updateActive, finishWorkout, cancelWorkout } = useApp()
  const timer = useTimer()
  const { toast } = useToast()
  const navigate = useNavigate()
  const active = data.active

  const elapsed = useElapsed(active?.startedAt)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)

  const stats = useMemo(() => {
    if (!active) return { total: 0, done: 0 }
    const all = active.exercises.flatMap((e) => e.sets)
    return { total: all.length, done: all.filter((s) => s.done).length }
  }, [active])

  // Index prvého cviku s nedokončenou sériou – „aktuálny cvik".
  const currentIndex = useMemo(() => {
    if (!active) return -1
    const i = active.exercises.findIndex((e) => e.sets.some((s) => !s.done))
    return i === -1 ? active.exercises.length - 1 : i
  }, [active])

  if (!active) {
    return (
      <div className="mx-auto max-w-lg pt-10 text-center">
        <h1 className="text-xl font-bold">Žiadny aktívny tréning</h1>
        <p className="mt-2 text-sm text-ink-dim">Vyber si tréningový plán a začni.</p>
        <Button className="mt-5" onClick={() => navigate('/training')}>
          Prejsť na tréningy
        </Button>
      </div>
    )
  }

  const progress = activeProgress(active)

  const toggleSet = (exId: string, setId: string) => {
    const ex = active.exercises.find((e) => e.id === exId)
    const set = ex?.sets.find((s) => s.id === setId)
    const wasDone = set?.done === true
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e) =>
        e.id === exId
          ? {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)),
            }
          : e,
      ),
    }))
    // Dokončená séria → automaticky spusti odpočinok.
    if (!wasDone) timer.start(data.prefs.restSec)
  }

  const patchSet = (exId: string, setId: string, patch: { reps?: number; weight?: number }) => {
    updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e) =>
        e.id === exId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    }))
  }

  const doFinish = () => {
    if (stats.done === 0) {
      toast('Označ aspoň jednu dokončenú sériu.', 'error')
      setConfirmFinish(false)
      return
    }
    timer.stop()
    const session = finishWorkout()
    if (session) navigate(`/history/${session.id}?summary=1`, { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl"
    >
      {/* Hlavička s časom a postupom */}
      <div className="sticky top-14 z-20 -mx-4 mb-5 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-2xl lg:border lg:px-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Späť (tréning beží ďalej)"
            onClick={() => navigate(-1)}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-base font-extrabold">{active.name}</h1>
            <p className="tnum mt-0.5 text-xs font-semibold text-accent-hi" role="timer">
              {formatDuration(elapsed)} · {stats.done}/{stats.total} sérií
            </p>
          </div>
          <button
            type="button"
            aria-label="Zrušiť tréning"
            onClick={() => setConfirmCancel(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-danger/10 hover:text-danger"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Cviky */}
      <div className="space-y-3">
        {active.exercises.map((ex, exIndex) => {
          const isCurrent = exIndex === currentIndex
          const exDone = ex.sets.every((s) => s.done)
          const prev = previousPerformance(data.sessions, ex.name)
          return (
            <Card
              key={ex.id}
              tone={isCurrent && !exDone ? 'accent' : 'default'}
              className={exDone ? 'opacity-75' : ''}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-base font-bold">
                  {exDone ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-extrabold text-ink-dim">
                      {exIndex + 1}
                    </span>
                  )}
                  <span className="truncate">{ex.name}</span>
                </h2>
                {isCurrent && !exDone && (
                  <span className="shrink-0 rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-hi">
                    Aktuálny
                  </span>
                )}
              </div>

              {prev && (
                <p className="mb-1 text-xs text-ink-dim">
                  Minule: {prev.sets}×{prev.reps} · {formatKg(prev.weight)}
                </p>
              )}
              {ex.note && (
                <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-dim">
                  <StickyNote className="size-3.5 shrink-0" aria-hidden />
                  {ex.note}
                </p>
              )}

              {/* Série */}
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_3rem] items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  <span>#</span>
                  <span className="text-center">Opak.</span>
                  <span className="text-center">Kg</span>
                  <span className="text-center">OK</span>
                </div>
                {ex.sets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-[1.5rem_1fr_1fr_3rem] items-center gap-2"
                  >
                    <span
                      className={`tnum text-center text-xs font-bold ${
                        set.done ? 'text-success' : 'text-ink-faint'
                      }`}
                    >
                      {setIndex + 1}
                    </span>
                    <InlineStepper
                      label={`Opakovania, séria ${setIndex + 1}`}
                      value={set.reps}
                      min={1}
                      max={200}
                      disabled={set.done}
                      onChange={(reps) => patchSet(ex.id, set.id, { reps })}
                    />
                    <InlineStepper
                      label={`Hmotnosť, séria ${setIndex + 1}`}
                      value={set.weight}
                      min={0}
                      max={600}
                      step={2.5}
                      disabled={set.done}
                      onChange={(weight) => patchSet(ex.id, set.id, { weight })}
                    />
                    <motion.button
                      type="button"
                      aria-label={
                        set.done
                          ? `Zrušiť dokončenie série ${setIndex + 1}`
                          : `Označiť sériu ${setIndex + 1} ako dokončenú`
                      }
                      aria-pressed={set.done}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleSet(ex.id, set.id)}
                      className={`mx-auto flex size-10 items-center justify-center rounded-lg border transition-colors ${
                        set.done
                          ? 'border-success bg-success text-bg'
                          : 'border-line-strong bg-surface-3 text-ink-faint hover:border-success/60 hover:text-success'
                      }`}
                    >
                      <Check className="size-5" aria-hidden />
                    </motion.button>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Dokončenie */}
      <div className="sticky bottom-20 z-20 mt-6 lg:bottom-6">
        <Button
          variant="success"
          size="lg"
          className="w-full shadow-xl shadow-black/40"
          onClick={() => {
            if (stats.done < stats.total) setConfirmFinish(true)
            else doFinish()
          }}
        >
          <Flag className="size-5" aria-hidden /> Dokončiť tréning
        </Button>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Zrušiť tréning?"
        message="Prebiehajúci tréning sa zahodí bez uloženia do histórie. Táto akcia sa nedá vrátiť."
        confirmLabel="Zahodiť tréning"
        cancelLabel="Pokračovať"
        danger
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          timer.stop()
          cancelWorkout()
          toast('Tréning bol zrušený.', 'info')
          navigate('/')
        }}
      />

      <ConfirmDialog
        open={confirmFinish}
        title="Dokončiť tréning?"
        message={`Zostáva ${stats.total - stats.done} neoznačených sérií. Do histórie sa uložia iba dokončené série.`}
        confirmLabel="Dokončiť"
        cancelLabel="Ešte nie"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={doFinish}
      />
    </motion.div>
  )
}
