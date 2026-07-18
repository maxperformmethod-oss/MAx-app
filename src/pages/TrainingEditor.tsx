import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Dumbbell,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextField } from '../components/ui/TextField'
import { NumberField } from '../components/ui/NumberField'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { previousPerformance } from '../utils/calc'
import { formatKg, formatRelativeDay, plural } from '../utils/format'
import { uid } from '../utils/id'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type PlanExercise, type WorkoutPlan } from '../types'

function newExercise(): PlanExercise {
  return {
    id: uid(),
    name: '',
    sets: [
      { id: uid(), reps: 8, weight: 20 },
      { id: uid(), reps: 8, weight: 20 },
      { id: uid(), reps: 8, weight: 20 },
    ],
  }
}

/** Editor tréningového plánu – vytvorenie aj úprava. */
export default function TrainingEditor() {
  const { id } = useParams()
  const isNew = !id
  const { data, savePlan } = useApp()
  const { toast } = useToast()
  const navigate = useNavigate()

  const existing = useMemo(() => data.plans.find((p) => p.id === id) ?? null, [data.plans, id])

  const [name, setName] = useState(existing?.name ?? '')
  const [exercises, setExercises] = useState<PlanExercise[]>(
    existing?.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) ?? [
      newExercise(),
    ],
  )
  const [touched, setTouched] = useState(false)
  const [toRemove, setToRemove] = useState<string | null>(null)

  if (!isNew && !existing) {
    return (
      <div className="mx-auto max-w-lg pt-10 text-center">
        <h1 className="text-xl font-bold">Tréning sa nenašiel</h1>
        <p className="mt-2 text-sm text-ink-dim">Plán mohol byť odstránený.</p>
        <Button className="mt-5" onClick={() => navigate('/training')}>
          Späť na tréningy
        </Button>
      </div>
    )
  }

  const nameError = touched && name.trim() === '' ? 'Zadaj názov tréningu.' : undefined

  const patchExercise = (exId: string, patch: Partial<PlanExercise>) => {
    setExercises((list) => list.map((e) => (e.id === exId ? { ...e, ...patch } : e)))
  }

  const move = (index: number, dir: -1 | 1) => {
    setExercises((list) => {
      const next = [...list]
      const target = index + dir
      if (target < 0 || target >= next.length) return list
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const addSet = (ex: PlanExercise) => {
    const last = ex.sets[ex.sets.length - 1]
    patchExercise(ex.id, {
      sets: [...ex.sets, { id: uid(), reps: last?.reps ?? 8, weight: last?.weight ?? 20 }],
    })
  }

  const removeSet = (ex: PlanExercise, setId: string) => {
    if (ex.sets.length <= 1) {
      toast('Cvik musí mať aspoň jednu sériu.', 'error')
      return
    }
    patchExercise(ex.id, { sets: ex.sets.filter((s) => s.id !== setId) })
  }

  const validate = (): string | null => {
    if (name.trim() === '') return 'Zadaj názov tréningu.'
    if (exercises.length === 0) return 'Pridaj aspoň jeden cvik.'
    for (const ex of exercises) {
      if (ex.name.trim() === '') return 'Každý cvik musí mať názov.'
      if (ex.sets.length === 0) return 'Každý cvik musí mať aspoň jednu sériu.'
    }
    return null
  }

  const handleSave = () => {
    setTouched(true)
    const error = validate()
    if (error) {
      toast(error, 'error')
      return
    }
    const now = new Date().toISOString()
    const plan: WorkoutPlan = {
      id: existing?.id ?? uid(),
      name: name.trim(),
      exercises: exercises.map((e) => ({
        ...e,
        name: e.name.trim(),
        ...(e.note?.trim() ? { note: e.note.trim() } : { note: undefined }),
      })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    savePlan(plan)
    toast(isNew ? 'Tréning bol vytvorený.' : 'Zmeny boli uložené.', 'success')
    navigate('/training')
  }

  const exToRemove = exercises.find((e) => e.id === toRemove)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="Späť na tréningy"
          onClick={() => navigate('/training')}
          className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? 'Nový tréning' : 'Upraviť tréning'}
        </h1>
      </div>

      <Card>
        <TextField
          label="Názov tréningu"
          placeholder="Napr. Dolná časť tela"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          error={nameError}
        />
      </Card>

      <div className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {exercises.map((ex, index) => {
            const prev = previousPerformance(data.sessions, ex.name)
            return (
              <motion.div
                key={ex.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-accent/12 text-xs font-extrabold text-accent-hi">
                      {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Posunúť cvik vyššie"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="flex size-9 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-3 hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Posunúť cvik nižšie"
                        disabled={index === exercises.length - 1}
                        onClick={() => move(index, 1)}
                        className="flex size-9 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-3 hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Odstrániť cvik"
                        onClick={() => setToRemove(ex.id)}
                        className="flex size-9 items-center justify-center rounded-lg text-ink-dim hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <TextField
                      label="Názov cviku"
                      placeholder="Napr. Drep s činkou"
                      value={ex.name}
                      maxLength={60}
                      onChange={(e) => patchExercise(ex.id, { name: e.target.value })}
                      error={touched && ex.name.trim() === '' ? 'Zadaj názov cviku.' : undefined}
                    />
                    <div>
                      <label
                        htmlFor={`muscle-group-${ex.id}`}
                        className="mb-1.5 block text-xs font-medium text-ink-dim"
                      >
                        Partia (voliteľné)
                      </label>
                      <select
                        id={`muscle-group-${ex.id}`}
                        value={ex.muscleGroup ?? ''}
                        onChange={(e) =>
                          patchExercise(ex.id, {
                            muscleGroup: e.target.value ? (e.target.value as PlanExercise['muscleGroup']) : undefined,
                          })
                        }
                        className="h-11 w-full min-w-36 rounded-xl border border-line-strong bg-surface-3 px-3 text-sm font-medium text-ink outline-none focus:border-accent sm:w-auto"
                      >
                        <option value="">Nezaradené</option>
                        {MUSCLE_GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {MUSCLE_GROUP_LABELS[g]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {prev && (
                    <p className="mt-2 text-xs text-ink-dim">
                      Posledný výkon: {prev.sets}×{prev.reps} · {formatKg(prev.weight)} (
                      {formatRelativeDay(prev.date).toLowerCase()})
                    </p>
                  )}

                  {/* Série */}
                  <div className="mt-4 space-y-2.5">
                    {ex.sets.map((set, setIndex) => (
                      <div key={set.id} className="flex items-end gap-2">
                        <span className="tnum mb-3 w-6 shrink-0 text-center text-xs font-bold text-ink-faint">
                          {setIndex + 1}
                        </span>
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          <NumberField
                            compact
                            label="Opakovania"
                            value={set.reps}
                            min={1}
                            max={200}
                            onChange={(reps) =>
                              patchExercise(ex.id, {
                                sets: ex.sets.map((s) => (s.id === set.id ? { ...s, reps } : s)),
                              })
                            }
                          />
                          <NumberField
                            compact
                            label="Hmotnosť (kg)"
                            value={set.weight}
                            min={0}
                            max={600}
                            step={2.5}
                            onChange={(weight) =>
                              patchExercise(ex.id, {
                                sets: ex.sets.map((s) => (s.id === set.id ? { ...s, weight } : s)),
                              })
                            }
                          />
                        </div>
                        <button
                          type="button"
                          aria-label={`Odstrániť sériu ${setIndex + 1}`}
                          onClick={() => removeSet(ex, set.id)}
                          className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-danger/10 hover:text-danger"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Button variant="ghost" size="sm" onClick={() => addSet(ex)}>
                      <Plus className="size-4" aria-hidden /> Pridať sériu
                    </Button>
                    <span className="text-xs text-ink-faint">
                      {plural(ex.sets.length, 'séria', 'série', 'sérií')}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-line pt-3">
                    <TextField
                      label="Poznámka (voliteľná)"
                      placeholder="Napr. tempo, technika, pomôcky…"
                      value={ex.note ?? ''}
                      maxLength={140}
                      onChange={(e) => patchExercise(ex.id, { note: e.target.value })}
                    />
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="mt-4">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setExercises((list) => [...list, newExercise()])}
        >
          <Dumbbell className="size-4" aria-hidden /> Pridať cvik
        </Button>
      </div>

      <div className="sticky bottom-20 z-20 mt-6 lg:bottom-6">
        <Button size="lg" className="w-full shadow-xl shadow-black/40" onClick={handleSave}>
          <Check className="size-5" aria-hidden />
          {isNew ? 'Vytvoriť tréning' : 'Uložiť zmeny'}
        </Button>
      </div>

      <ConfirmDialog
        open={toRemove !== null}
        title="Odstrániť cvik?"
        message={`Cvik „${exToRemove?.name || 'bez názvu'}" sa odstráni z tohto plánu.`}
        confirmLabel="Odstrániť"
        danger
        onCancel={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) setExercises((list) => list.filter((e) => e.id !== toRemove))
          setToRemove(null)
        }}
      />
    </motion.div>
  )
}
