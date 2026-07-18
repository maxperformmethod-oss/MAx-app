/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActiveWorkout,
  AppData,
  Preferences,
  WorkoutPlan,
  WorkoutSession,
} from '../types'
import {
  clearData,
  defaultData,
  exportJson,
  importJson,
  loadData,
  saveData,
} from '../storage/storage'
import { demoPlans, demoSessions } from '../data/demo'
import { activeToSessionExercises, sessionVolume } from '../utils/calc'
import { uid } from '../utils/id'

interface AppContextValue {
  data: AppData
  /* plány */
  savePlan: (plan: WorkoutPlan) => void
  deletePlan: (planId: string) => void
  /* aktívny tréning */
  startWorkout: (planId: string) => boolean
  updateActive: (updater: (active: ActiveWorkout) => ActiveWorkout) => void
  finishWorkout: () => WorkoutSession | null
  cancelWorkout: () => void
  /* história */
  deleteSession: (sessionId: string) => void
  /* preferencie a dáta */
  setPrefs: (patch: Partial<Preferences>) => void
  loadDemo: () => void
  removeDemo: () => void
  startEmpty: () => void
  exportData: () => string
  importData: (json: string) => boolean
  resetAll: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const skipSave = useRef(true)
  // Ref na aktuálne dáta – akcie s návratovou hodnotou (startWorkout,
  // finishWorkout) nesmú čítať stav zo setState updatera, ten beží až
  // pri ďalšom renderi.
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    // Prvý render – dáta práve prišli z localStorage, netreba ich hneď zapisovať.
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    saveData(data)
  }, [data])

  const savePlan = useCallback((plan: WorkoutPlan) => {
    setData((d) => {
      const exists = d.plans.some((p) => p.id === plan.id)
      const updated = { ...plan, updatedAt: new Date().toISOString() }
      return {
        ...d,
        plans: exists
          ? d.plans.map((p) => (p.id === plan.id ? updated : p))
          : [updated, ...d.plans],
      }
    })
  }, [])

  const deletePlan = useCallback((planId: string) => {
    setData((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== planId) }))
  }, [])

  const startWorkout = useCallback((planId: string): boolean => {
    const d = dataRef.current
    if (d.active) {
      return d.active.planId === planId // už beží – pokračujeme v ňom
    }
    const plan = d.plans.find((p) => p.id === planId)
    if (!plan || plan.exercises.length === 0) return false
    const active: ActiveWorkout = {
      planId: plan.id,
      name: plan.name,
      startedAt: new Date().toISOString(),
      exercises: plan.exercises.map((ex) => ({
        id: uid(),
        name: ex.name,
        ...(ex.note ? { note: ex.note } : {}),
        ...(ex.muscleGroup ? { muscleGroup: ex.muscleGroup } : {}),
        sets: ex.sets.map((s) => ({ id: uid(), reps: s.reps, weight: s.weight, done: false })),
      })),
    }
    setData({ ...d, active })
    return true
  }, [])

  const updateActive = useCallback((updater: (a: ActiveWorkout) => ActiveWorkout) => {
    setData((d) => (d.active ? { ...d, active: updater(d.active) } : d))
  }, [])

  const finishWorkout = useCallback((): WorkoutSession | null => {
    const d = dataRef.current
    if (!d.active) return null
    const exercises = activeToSessionExercises(d.active)
    const finishedAt = new Date()
    const startedAt = new Date(d.active.startedAt)
    const session: WorkoutSession = {
      id: uid(),
      planId: d.active.planId,
      name: d.active.name,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationSec: Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)),
      exercises,
      volume: sessionVolume(exercises),
    }
    setData({ ...d, active: null, sessions: [session, ...d.sessions] })
    return session
  }, [])

  const cancelWorkout = useCallback(() => {
    setData((d) => ({ ...d, active: null }))
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== sessionId) }))
  }, [])

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setData((d) => ({ ...d, prefs: { ...d.prefs, ...patch } }))
  }, [])

  const loadDemo = useCallback(() => {
    setData((d) => ({
      ...d,
      plans: [...d.plans.filter((p) => !p.isDemo), ...demoPlans()],
      sessions: [...d.sessions.filter((s) => !s.isDemo), ...demoSessions()].sort(
        (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
      ),
      prefs: { ...d.prefs, onboarded: true },
    }))
  }, [])

  const removeDemo = useCallback(() => {
    setData((d) => ({
      ...d,
      plans: d.plans.filter((p) => !p.isDemo),
      sessions: d.sessions.filter((s) => !s.isDemo),
    }))
  }, [])

  const startEmpty = useCallback(() => {
    setData((d) => ({ ...d, prefs: { ...d.prefs, onboarded: true } }))
  }, [])

  const exportData = useCallback(() => exportJson(loadData()), [])

  const importData = useCallback((json: string): boolean => {
    const imported = importJson(json)
    if (!imported) return false
    setData({ ...imported, prefs: { ...imported.prefs, onboarded: true } })
    return true
  }, [])

  const resetAll = useCallback(() => {
    clearData()
    setData(defaultData())
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      savePlan,
      deletePlan,
      startWorkout,
      updateActive,
      finishWorkout,
      cancelWorkout,
      deleteSession,
      setPrefs,
      loadDemo,
      removeDemo,
      startEmpty,
      exportData,
      importData,
      resetAll,
    }),
    [
      data,
      savePlan,
      deletePlan,
      startWorkout,
      updateActive,
      finishWorkout,
      cancelWorkout,
      deleteSession,
      setPrefs,
      loadDemo,
      removeDemo,
      startEmpty,
      exportData,
      importData,
      resetAll,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp musí byť použitý vo vnútri AppProvider')
  return ctx
}
