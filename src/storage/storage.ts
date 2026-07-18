import type {
  ActiveWorkout,
  AppData,
  MuscleGroup,
  Preferences,
  WorkoutPlan,
  WorkoutSession,
} from '../types'
import { MUSCLE_GROUPS } from '../types'
import { uid } from '../utils/id'

/**
 * Centralizovaná dátová vrstva nad localStorage.
 * Všetky dáta žijú pod jedným verzovaným kľúčom – jediné miesto,
 * ktoré číta a zapisuje localStorage.
 *
 * Migrácia v1 → v2: sanitizeData nižšie nikdy nečíta pole `version` zo
 * vstupu (vždy prepočíta a zapíše DATA_VERSION) a každé pole odvodzuje
 * defenzívne s fallbackom. Staré v1 záznamy tak automaticky dostanú
 * `prefs.weeklyGoal = 3` a cviky bez `muscleGroup` zostanú „nezaradené"
 * (undefined) – žiadna strata dát, žiadny explicitný migračný krok.
 */
const STORAGE_KEY = 'maxperform:data'
export const DATA_VERSION = 2 as const

export function defaultPreferences(): Preferences {
  return { restSec: 90, soundOn: true, onboarded: false, weeklyGoal: 3 }
}

function muscleGroup(v: unknown): MuscleGroup | undefined {
  return typeof v === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(v)
    ? (v as MuscleGroup)
    : undefined
}

export function defaultData(): AppData {
  return {
    version: DATA_VERSION,
    plans: [],
    sessions: [],
    active: null,
    prefs: defaultPreferences(),
  }
}

/* ---------- sanitizácia (ochrana pred poškodenými dátami) ---------- */

function num(v: unknown, fallback: number, min = 0): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback
  return Math.max(min, n)
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function isoDate(v: unknown): string {
  const s = str(v)
  return Number.isNaN(new Date(s).getTime()) ? new Date().toISOString() : s
}

function sanitizePlan(raw: unknown): WorkoutPlan | null {
  if (typeof raw !== 'object' || raw === null) return null
  const p = raw as Record<string, unknown>
  const name = str(p.name).trim()
  if (!name) return null
  const exercises = Array.isArray(p.exercises)
    ? p.exercises
        .map((e) => {
          if (typeof e !== 'object' || e === null) return null
          const ex = e as Record<string, unknown>
          const exName = str(ex.name).trim()
          if (!exName) return null
          const sets = Array.isArray(ex.sets)
            ? ex.sets
                .filter((s) => typeof s === 'object' && s !== null)
                .map((s) => {
                  const set = s as Record<string, unknown>
                  return {
                    id: str(set.id) || uid(),
                    reps: num(set.reps, 8, 1),
                    weight: num(set.weight, 0),
                  }
                })
            : []
          if (sets.length === 0) return null
          const note = str(ex.note).trim()
          const mg = muscleGroup(ex.muscleGroup)
          return {
            id: str(ex.id) || uid(),
            name: exName,
            sets,
            ...(note ? { note } : {}),
            ...(mg ? { muscleGroup: mg } : {}),
          }
        })
        .filter((e) => e !== null)
    : []
  return {
    id: str(p.id) || uid(),
    name,
    exercises,
    createdAt: isoDate(p.createdAt),
    updatedAt: isoDate(p.updatedAt),
    ...(p.isDemo === true ? { isDemo: true } : {}),
  }
}

function sanitizeSession(raw: unknown): WorkoutSession | null {
  if (typeof raw !== 'object' || raw === null) return null
  const s = raw as Record<string, unknown>
  const name = str(s.name).trim()
  if (!name) return null
  const exercises = Array.isArray(s.exercises)
    ? s.exercises
        .map((e) => {
          if (typeof e !== 'object' || e === null) return null
          const ex = e as Record<string, unknown>
          const exName = str(ex.name).trim()
          if (!exName) return null
          const sets = Array.isArray(ex.sets)
            ? ex.sets
                .filter((x) => typeof x === 'object' && x !== null)
                .map((x) => {
                  const set = x as Record<string, unknown>
                  return { reps: num(set.reps, 0), weight: num(set.weight, 0) }
                })
            : []
          const note = str(ex.note).trim()
          const mg = muscleGroup(ex.muscleGroup)
          return { name: exName, sets, ...(note ? { note } : {}), ...(mg ? { muscleGroup: mg } : {}) }
        })
        .filter((e) => e !== null)
    : []
  const volume = exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((v, set) => v + set.reps * set.weight, 0),
    0,
  )
  return {
    id: str(s.id) || uid(),
    planId: typeof s.planId === 'string' ? s.planId : null,
    name,
    startedAt: isoDate(s.startedAt),
    finishedAt: isoDate(s.finishedAt),
    durationSec: num(s.durationSec, 0),
    exercises,
    volume,
    ...(s.isDemo === true ? { isDemo: true } : {}),
  }
}

function sanitizeActive(raw: unknown): ActiveWorkout | null {
  if (typeof raw !== 'object' || raw === null) return null
  const a = raw as Record<string, unknown>
  const name = str(a.name).trim()
  if (!name || !Array.isArray(a.exercises)) return null
  const exercises = a.exercises
    .map((e) => {
      if (typeof e !== 'object' || e === null) return null
      const ex = e as Record<string, unknown>
      const exName = str(ex.name).trim()
      if (!exName) return null
      const sets = Array.isArray(ex.sets)
        ? ex.sets
            .filter((x) => typeof x === 'object' && x !== null)
            .map((x) => {
              const set = x as Record<string, unknown>
              return {
                id: str(set.id) || uid(),
                reps: num(set.reps, 8, 1),
                weight: num(set.weight, 0),
                done: set.done === true,
              }
            })
        : []
      if (sets.length === 0) return null
      const note = str(ex.note).trim()
      const mg = muscleGroup(ex.muscleGroup)
      return {
        id: str(ex.id) || uid(),
        name: exName,
        sets,
        ...(note ? { note } : {}),
        ...(mg ? { muscleGroup: mg } : {}),
      }
    })
    .filter((e) => e !== null)
  if (exercises.length === 0) return null
  return {
    planId: typeof a.planId === 'string' ? a.planId : null,
    name,
    startedAt: isoDate(a.startedAt),
    exercises,
  }
}

function sanitizePrefs(raw: unknown): Preferences {
  const d = defaultPreferences()
  if (typeof raw !== 'object' || raw === null) return d
  const p = raw as Record<string, unknown>
  return {
    restSec: Math.min(600, num(p.restSec, d.restSec, 5)),
    soundOn: typeof p.soundOn === 'boolean' ? p.soundOn : d.soundOn,
    onboarded: p.onboarded === true,
    weeklyGoal: Math.min(14, num(p.weeklyGoal, d.weeklyGoal, 1)),
  }
}

/** Zvaliduje neznámy objekt na AppData; poškodené časti nahradí bezpečnými hodnotami. */
export function sanitizeData(raw: unknown): AppData {
  if (typeof raw !== 'object' || raw === null) return defaultData()
  const d = raw as Record<string, unknown>
  // Miesto pre budúce migrácie: if (d.version === 0) { ... }
  return {
    version: DATA_VERSION,
    plans: Array.isArray(d.plans) ? d.plans.map(sanitizePlan).filter((p) => p !== null) : [],
    sessions: Array.isArray(d.sessions)
      ? d.sessions
          .map(sanitizeSession)
          .filter((s) => s !== null)
          .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
      : [],
    active: sanitizeActive(d.active),
    prefs: sanitizePrefs(d.prefs),
  }
}

/* ---------- čítanie a zápis ---------- */

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    return sanitizeData(JSON.parse(raw))
  } catch {
    // Poškodený JSON alebo nedostupný localStorage – začíname od nuly.
    return defaultData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Plné alebo nedostupné úložisko – aplikácia beží ďalej z pamäte.
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignoruj
  }
}

/* ---------- export / import ---------- */

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

/** Import: vráti zvalidované dáta alebo null, ak vstup nie je použiteľný. */
export function importJson(text: string): AppData | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.plans) && !Array.isArray(obj.sessions)) return null
    return sanitizeData(parsed)
  } catch {
    return null
  }
}
