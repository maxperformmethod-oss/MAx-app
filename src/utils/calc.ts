import type {
  ActiveWorkout,
  ExerciseRecordRow,
  MuscleGroup,
  PersonalRecord,
  SessionExercise,
  WorkoutSession,
} from '../types'
import { dayKey, startOfDay } from './format'

/** Objem cviku = súčet (opakovania × hmotnosť) všetkých sérií. */
export function exerciseVolume(sets: { reps: number; weight: number }[]): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weight, 0)
}

/** Celkový objem tréningu. */
export function sessionVolume(exercises: SessionExercise[]): number {
  return exercises.reduce((sum, e) => sum + exerciseVolume(e.sets), 0)
}

/**
 * Orientačný odhad spálených kalórií zo silového tréningu (~6 kcal/min).
 * Nejde o medicínsky presný údaj.
 */
export function estimateCalories(durationSec: number): number {
  return Math.round((durationSec / 60) * 6)
}

/**
 * Séria aktívnych dní: počet po sebe idúcich dní s dokončeným tréningom,
 * končiacich dnes alebo včera (dnešný deň sériu neruší, kým neskončí).
 */
export function currentStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0
  const days = new Set(sessions.map((s) => dayKey(s.finishedAt)))
  const cursor = startOfDay(new Date())
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1) // séria môže končiť včera
    if (!days.has(dayKey(cursor))) return 0
  }
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Pondelok aktuálneho týždňa. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7 // 0 = pondelok
  x.setDate(x.getDate() - day)
  return x
}

/** Dni tohto týždňa (po–ne) s príznakom, či sa v nich trénovalo. */
export function weekConsistency(sessions: WorkoutSession[]): { date: Date; trained: boolean }[] {
  const days = new Set(sessions.map((s) => dayKey(s.finishedAt)))
  const monday = startOfWeek(new Date())
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return { date, trained: days.has(dayKey(date)) }
  })
}

/**
 * Osobné rekordy: pre každý cvik najvyššia hmotnosť dokončenej série.
 * Pri rovnakej hmotnosti rozhoduje vyšší počet opakovaní.
 */
export function personalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.weight <= 0) continue
        const prev = best.get(ex.name)
        if (
          !prev ||
          set.weight > prev.weight ||
          (set.weight === prev.weight && set.reps > prev.reps)
        ) {
          best.set(ex.name, {
            exercise: ex.name,
            weight: set.weight,
            reps: set.reps,
            date: s.finishedAt,
          })
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight)
}

/** Posledný zaznamenaný výkon daného cviku (najnovší tréning, ktorý ho obsahuje). */
export function previousPerformance(
  sessions: WorkoutSession[],
  exerciseName: string,
): { sets: number; reps: number; weight: number; date: string } | null {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
  )
  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.name.trim().toLowerCase() === exerciseName.trim().toLowerCase())
    if (ex && ex.sets.length > 0) {
      const top = ex.sets.reduce((a, b) => (b.weight > a.weight ? b : a))
      return { sets: ex.sets.length, reps: top.reps, weight: top.weight, date: s.finishedAt }
    }
  }
  return null
}

/** Nové osobné rekordy dosiahnuté v danom tréningu oproti starším tréningom. */
export function newRecordsInSession(
  session: WorkoutSession,
  allSessions: WorkoutSession[],
): PersonalRecord[] {
  const older = allSessions.filter(
    (s) => s.id !== session.id && new Date(s.finishedAt) < new Date(session.finishedAt),
  )
  const prevBest = new Map(personalRecords(older).map((r) => [r.exercise, r]))
  const out: PersonalRecord[] = []
  for (const ex of session.exercises) {
    const top = ex.sets.filter((s) => s.weight > 0)
    if (top.length === 0) continue
    const max = top.reduce((a, b) => (b.weight > a.weight ? b : a))
    const prev = prevBest.get(ex.name)
    if (!prev || max.weight > prev.weight) {
      out.push({ exercise: ex.name, weight: max.weight, reps: max.reps, date: session.finishedAt })
    }
  }
  return out
}

/** Dokončené série aktívneho tréningu → formát histórie. */
export function activeToSessionExercises(active: ActiveWorkout): SessionExercise[] {
  return active.exercises
    .map((ex) => ({
      name: ex.name,
      note: ex.note,
      muscleGroup: ex.muscleGroup,
      sets: ex.sets.filter((s) => s.done).map((s) => ({ reps: s.reps, weight: s.weight })),
    }))
    .filter((ex) => ex.sets.length > 0)
}

/** Percento dokončených sérií aktívneho tréningu (0–1). */
export function activeProgress(active: ActiveWorkout): number {
  const all = active.exercises.flatMap((e) => e.sets)
  if (all.length === 0) return 0
  return all.filter((s) => s.done).length / all.length
}

/**
 * Odhad jednoopakovacieho maxima (1RM) podľa Epleyho vzorca.
 * Ide výhradne o ODHAD, nie o zmeraný výkon.
 */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + reps / 30)
}

/**
 * Rekordný riadok pre každý cvik v histórii: najlepší odhad 1RM, najťažšia
 * séria a najväčší objem jednej série. Partia sa preberá z najnovšieho
 * výskytu cviku, ktorý ju má priradenú.
 */
export function exerciseRecords(sessions: WorkoutSession[]): ExerciseRecordRow[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
  )
  const rows = new Map<string, ExerciseRecordRow>()
  for (const s of sorted) {
    for (const ex of s.exercises) {
      let row = rows.get(ex.name)
      if (!row) {
        row = { exercise: ex.name, best1RM: null, heaviestSet: null, bestSetVolume: null }
        rows.set(ex.name, row)
      }
      if (!row.muscleGroup && ex.muscleGroup) row.muscleGroup = ex.muscleGroup
      for (const set of ex.sets) {
        if (set.weight <= 0 || set.reps <= 0) continue
        const oneRm = epley1RM(set.weight, set.reps)
        if (!row.best1RM || oneRm > row.best1RM.value) {
          row.best1RM = { value: oneRm, weight: set.weight, reps: set.reps, date: s.finishedAt }
        }
        if (
          !row.heaviestSet ||
          set.weight > row.heaviestSet.weight ||
          (set.weight === row.heaviestSet.weight && set.reps > row.heaviestSet.reps)
        ) {
          row.heaviestSet = { weight: set.weight, reps: set.reps, date: s.finishedAt }
        }
        const vol = set.weight * set.reps
        if (!row.bestSetVolume || vol > row.bestSetVolume.volume) {
          row.bestSetVolume = { volume: vol, weight: set.weight, reps: set.reps, date: s.finishedAt }
        }
      }
    }
  }
  return [...rows.values()]
    .filter((r) => r.best1RM || r.heaviestSet || r.bestSetVolume)
    .sort((a, b) => (b.best1RM?.value ?? 0) - (a.best1RM?.value ?? 0))
}

/** Súčet objemu (opakovania × hmotnosť) podľa svalovej partie vo vybraných tréningoch. */
export function volumeByMuscleGroup(
  sessions: WorkoutSession[],
): { group: MuscleGroup | 'nezaradene'; volume: number }[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const key = ex.muscleGroup ?? 'nezaradene'
      totals.set(key, (totals.get(key) ?? 0) + exerciseVolume(ex.sets))
    }
  }
  return [...totals.entries()]
    .map(([group, volume]) => ({ group: group as MuscleGroup | 'nezaradene', volume }))
    .filter((row) => row.volume > 0)
    .sort((a, b) => b.volume - a.volume)
}
