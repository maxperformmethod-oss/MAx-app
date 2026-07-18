import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Dumbbell, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { formatRelativeDay, plural } from '../utils/format'

export default function TrainingList() {
  const { data, deletePlan, startWorkout } = useApp()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [toDelete, setToDelete] = useState<string | null>(null)

  const lastTrained = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of data.sessions) {
      if (!s.planId) continue
      const prev = map.get(s.planId)
      if (!prev || new Date(s.finishedAt) > new Date(prev)) map.set(s.planId, s.finishedAt)
    }
    return map
  }, [data.sessions])

  const planToDelete = data.plans.find((p) => p.id === toDelete)

  const handleStart = (planId: string) => {
    if (data.active && data.active.planId !== planId) {
      toast('Najprv dokonči alebo zruš prebiehajúci tréning.', 'error')
      navigate('/workout')
      return
    }
    if (startWorkout(planId)) navigate('/workout')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tréningové plány</h1>
          <p className="mt-1 text-sm text-ink-dim">
            {plural(data.plans.length, 'plán', 'plány', 'plánov')}
          </p>
        </div>
        <Button onClick={() => navigate('/training/new')}>
          <Plus className="size-4" aria-hidden /> Nový tréning
        </Button>
      </div>

      {data.plans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Zatiaľ žiadne tréningy"
          message="Vytvor si prvý tréningový plán – cviky, série, opakovania a váhy."
          action={
            <Button onClick={() => navigate('/training/new')}>
              <Plus className="size-4" aria-hidden /> Vytvoriť prvý tréning
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.plans.map((plan) => {
            const setCount = plan.exercises.reduce((n, e) => n + e.sets.length, 0)
            const last = lastTrained.get(plan.id)
            return (
              <Card key={plan.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/training/${plan.id}`} className="min-w-0 flex-1 group">
                    <h2 className="truncate text-base font-bold group-hover:text-accent-hi">
                      {plan.name}
                      {plan.isDemo && (
                        <span className="ml-2 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning align-middle">
                          Demo
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 text-xs text-ink-dim">
                      {plural(plan.exercises.length, 'cvik', 'cviky', 'cvikov')} ·{' '}
                      {plural(setCount, 'séria', 'série', 'sérií')}
                      {last ? ` · naposledy ${formatRelativeDay(last).toLowerCase()}` : ''}
                    </p>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Upraviť ${plan.name}`}
                      onClick={() => navigate(`/training/${plan.id}`)}
                      className="flex size-9 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-3 hover:text-ink"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Odstrániť ${plan.name}`}
                      onClick={() => setToDelete(plan.id)}
                      className="flex size-9 items-center justify-center rounded-lg text-ink-dim hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>

                {plan.exercises.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-ink-dim">
                    {plan.exercises.slice(0, 3).map((ex) => (
                      <li key={ex.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{ex.name}</span>
                        <span className="tnum shrink-0 text-xs text-ink-faint">
                          {ex.sets.length}×{ex.sets[0]?.reps ?? 0}
                        </span>
                      </li>
                    ))}
                    {plan.exercises.length > 3 && (
                      <li className="text-xs text-ink-faint">
                        + {plural(plan.exercises.length - 3, 'ďalší cvik', 'ďalšie cviky', 'ďalších cvikov')}
                      </li>
                    )}
                  </ul>
                )}

                <div className="mt-4 flex-1" />
                <Button
                  className="w-full"
                  disabled={plan.exercises.length === 0}
                  onClick={() => handleStart(plan.id)}
                >
                  <Play className="size-4" aria-hidden />
                  {data.active?.planId === plan.id ? 'Pokračovať v tréningu' : 'Začať tréning'}
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Odstrániť tréning?"
        message={`Tréningový plán „${planToDelete?.name ?? ''}" sa natrvalo odstráni. História dokončených tréningov zostane zachovaná.`}
        confirmLabel="Odstrániť"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deletePlan(toDelete)
            toast('Tréning bol odstránený.', 'success')
          }
          setToDelete(null)
        }}
      />
    </motion.div>
  )
}
