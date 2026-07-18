import type { MuscleGroup, WorkoutPlan, WorkoutSession } from '../types'
import { sessionVolume } from '../utils/calc'

/**
 * Ukážkové dáta – deterministické (žiadna náhoda), viazané na aktuálny dátum
 * len posunom dní dozadu, aby história vyzerala živo. Všetko je označené
 * isDemo a dá sa jedným krokom odstrániť v nastaveniach.
 */

/** Priradenie partie podľa názvu cviku – použité v plánoch aj v histórii. */
const EXERCISE_MUSCLE_GROUP: Record<string, MuscleGroup> = {
  'Drep s činkou': 'nohy',
  'Rumunský mŕtvy ťah': 'nohy',
  'Výpady s jednoručkami': 'nohy',
  'Výpony na lýtka': 'nohy',
  'Tlak na rovnej lavičke': 'hrud',
  'Príťahy v predklone': 'chrbat',
  'Tlak nad hlavu': 'ramena',
  Zhyby: 'chrbat',
  'Mŕtvy ťah': 'chrbat',
  'Tlak s jednoručkami v sede': 'ramena',
  'Veslovanie na trenažéri': 'chrbat',
  Plank: 'core',
}

function set(reps: number, weight: number) {
  return { reps, weight }
}

function plannedSets(id: string, count: number, reps: number, weight: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `${id}-s${i + 1}`, reps, weight }))
}

export function demoPlans(): WorkoutPlan[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-plan-lower',
      name: 'Dolná časť tela',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
      exercises: [
        { id: 'demo-lw-1', name: 'Drep s činkou', muscleGroup: 'nohy', sets: plannedSets('demo-lw-1', 4, 6, 80) },
        { id: 'demo-lw-2', name: 'Rumunský mŕtvy ťah', muscleGroup: 'nohy', sets: plannedSets('demo-lw-2', 3, 8, 70) },
        { id: 'demo-lw-3', name: 'Výpady s jednoručkami', muscleGroup: 'nohy', sets: plannedSets('demo-lw-3', 3, 10, 16) },
        { id: 'demo-lw-4', name: 'Výpony na lýtka', muscleGroup: 'nohy', sets: plannedSets('demo-lw-4', 4, 12, 40) },
      ],
    },
    {
      id: 'demo-plan-upper',
      name: 'Horná časť tela',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
      exercises: [
        { id: 'demo-up-1', name: 'Tlak na rovnej lavičke', muscleGroup: 'hrud', sets: plannedSets('demo-up-1', 4, 6, 70) },
        { id: 'demo-up-2', name: 'Príťahy v predklone', muscleGroup: 'chrbat', sets: plannedSets('demo-up-2', 4, 8, 60) },
        { id: 'demo-up-3', name: 'Tlak nad hlavu', muscleGroup: 'ramena', sets: plannedSets('demo-up-3', 3, 8, 40) },
        {
          id: 'demo-up-4',
          name: 'Zhyby',
          muscleGroup: 'chrbat',
          sets: plannedSets('demo-up-4', 3, 8, 0),
          note: 'S vlastnou váhou',
        },
      ],
    },
    {
      id: 'demo-plan-full',
      name: 'Celé telo – kondícia',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
      exercises: [
        { id: 'demo-fb-1', name: 'Mŕtvy ťah', muscleGroup: 'chrbat', sets: plannedSets('demo-fb-1', 3, 5, 100) },
        {
          id: 'demo-fb-2',
          name: 'Tlak s jednoručkami v sede',
          muscleGroup: 'ramena',
          sets: plannedSets('demo-fb-2', 3, 10, 22),
        },
        {
          id: 'demo-fb-3',
          name: 'Veslovanie na trenažéri',
          muscleGroup: 'chrbat',
          sets: plannedSets('demo-fb-3', 3, 12, 55),
        },
        {
          id: 'demo-fb-4',
          name: 'Plank',
          muscleGroup: 'core',
          sets: plannedSets('demo-fb-4', 3, 1, 0),
          note: '60 sekúnd výdrž',
        },
      ],
    },
  ]
}

interface DemoSessionSpec {
  daysAgo: number
  hour: number
  durationMin: number
  planId: string
  name: string
  exercises: { name: string; sets: { reps: number; weight: number }[] }[]
}

const SESSION_SPECS: DemoSessionSpec[] = [
  {
    daysAgo: 2, hour: 18, durationMin: 52, planId: 'demo-plan-upper', name: 'Horná časť tela',
    exercises: [
      { name: 'Tlak na rovnej lavičke', sets: [set(6, 70), set(6, 70), set(5, 72.5), set(5, 72.5)] },
      { name: 'Príťahy v predklone', sets: [set(8, 60), set(8, 60), set(8, 62.5), set(7, 62.5)] },
      { name: 'Tlak nad hlavu', sets: [set(8, 40), set(8, 40), set(7, 42.5)] },
      { name: 'Zhyby', sets: [set(8, 0), set(7, 0), set(6, 0)] },
    ],
  },
  {
    daysAgo: 4, hour: 17, durationMin: 58, planId: 'demo-plan-lower', name: 'Dolná časť tela',
    exercises: [
      { name: 'Drep s činkou', sets: [set(6, 80), set(6, 80), set(6, 82.5), set(5, 82.5)] },
      { name: 'Rumunský mŕtvy ťah', sets: [set(8, 70), set(8, 70), set(8, 72.5)] },
      { name: 'Výpady s jednoručkami', sets: [set(10, 16), set(10, 16), set(10, 18)] },
      { name: 'Výpony na lýtka', sets: [set(12, 40), set(12, 40), set(12, 40), set(12, 40)] },
    ],
  },
  {
    daysAgo: 7, hour: 18, durationMin: 47, planId: 'demo-plan-full', name: 'Celé telo – kondícia',
    exercises: [
      { name: 'Mŕtvy ťah', sets: [set(5, 100), set(5, 100), set(5, 105)] },
      { name: 'Tlak s jednoručkami v sede', sets: [set(10, 22), set(10, 22), set(9, 24)] },
      { name: 'Veslovanie na trenažéri', sets: [set(12, 55), set(12, 55), set(12, 55)] },
    ],
  },
  {
    daysAgo: 9, hour: 19, durationMin: 55, planId: 'demo-plan-upper', name: 'Horná časť tela',
    exercises: [
      { name: 'Tlak na rovnej lavičke', sets: [set(6, 67.5), set(6, 70), set(6, 70), set(5, 70)] },
      { name: 'Príťahy v predklone', sets: [set(8, 57.5), set(8, 60), set(8, 60), set(8, 60)] },
      { name: 'Tlak nad hlavu', sets: [set(8, 37.5), set(8, 40), set(7, 40)] },
      { name: 'Zhyby', sets: [set(7, 0), set(6, 0), set(6, 0)] },
    ],
  },
  {
    daysAgo: 11, hour: 17, durationMin: 60, planId: 'demo-plan-lower', name: 'Dolná časť tela',
    exercises: [
      { name: 'Drep s činkou', sets: [set(6, 77.5), set(6, 80), set(6, 80), set(5, 80)] },
      { name: 'Rumunský mŕtvy ťah', sets: [set(8, 67.5), set(8, 70), set(8, 70)] },
      { name: 'Výpady s jednoručkami', sets: [set(10, 16), set(10, 16), set(9, 16)] },
      { name: 'Výpony na lýtka', sets: [set(12, 37.5), set(12, 40), set(12, 40), set(11, 40)] },
    ],
  },
  {
    daysAgo: 14, hour: 18, durationMin: 45, planId: 'demo-plan-full', name: 'Celé telo – kondícia',
    exercises: [
      { name: 'Mŕtvy ťah', sets: [set(5, 97.5), set(5, 100), set(4, 100)] },
      { name: 'Tlak s jednoručkami v sede', sets: [set(10, 20), set(10, 22), set(10, 22)] },
      { name: 'Veslovanie na trenažéri', sets: [set(12, 50), set(12, 55), set(12, 55)] },
    ],
  },
  {
    daysAgo: 16, hour: 18, durationMin: 54, planId: 'demo-plan-upper', name: 'Horná časť tela',
    exercises: [
      { name: 'Tlak na rovnej lavičke', sets: [set(6, 67.5), set(6, 67.5), set(6, 67.5), set(6, 67.5)] },
      { name: 'Príťahy v predklone', sets: [set(8, 57.5), set(8, 57.5), set(8, 57.5)] },
      { name: 'Tlak nad hlavu', sets: [set(8, 37.5), set(8, 37.5), set(8, 37.5)] },
      { name: 'Zhyby', sets: [set(6, 0), set(6, 0), set(5, 0)] },
    ],
  },
  {
    daysAgo: 18, hour: 17, durationMin: 57, planId: 'demo-plan-lower', name: 'Dolná časť tela',
    exercises: [
      { name: 'Drep s činkou', sets: [set(6, 75), set(6, 77.5), set(6, 77.5), set(6, 77.5)] },
      { name: 'Rumunský mŕtvy ťah', sets: [set(8, 65), set(8, 67.5), set(8, 67.5)] },
      { name: 'Výpady s jednoručkami', sets: [set(10, 14), set(10, 16), set(10, 16)] },
      { name: 'Výpony na lýtka', sets: [set(12, 37.5), set(12, 37.5), set(12, 37.5), set(12, 37.5)] },
    ],
  },
  {
    daysAgo: 21, hour: 18, durationMin: 44, planId: 'demo-plan-full', name: 'Celé telo – kondícia',
    exercises: [
      { name: 'Mŕtvy ťah', sets: [set(5, 95), set(5, 97.5), set(5, 97.5)] },
      { name: 'Tlak s jednoručkami v sede', sets: [set(10, 20), set(10, 20), set(10, 20)] },
      { name: 'Veslovanie na trenažéri', sets: [set(12, 50), set(12, 50), set(12, 50)] },
    ],
  },
  {
    daysAgo: 23, hour: 18, durationMin: 51, planId: 'demo-plan-upper', name: 'Horná časť tela',
    exercises: [
      { name: 'Tlak na rovnej lavičke', sets: [set(6, 65), set(6, 65), set(6, 67.5), set(5, 67.5)] },
      { name: 'Príťahy v predklone', sets: [set(8, 55), set(8, 55), set(8, 57.5)] },
      { name: 'Tlak nad hlavu', sets: [set(8, 35), set(8, 37.5), set(7, 37.5)] },
      { name: 'Zhyby', sets: [set(6, 0), set(5, 0), set(5, 0)] },
    ],
  },
  {
    daysAgo: 25, hour: 17, durationMin: 56, planId: 'demo-plan-lower', name: 'Dolná časť tela',
    exercises: [
      { name: 'Drep s činkou', sets: [set(6, 75), set(6, 75), set(6, 75), set(5, 75)] },
      { name: 'Rumunský mŕtvy ťah', sets: [set(8, 65), set(8, 65), set(8, 65)] },
      { name: 'Výpady s jednoručkami', sets: [set(10, 14), set(10, 14), set(10, 14)] },
      { name: 'Výpony na lýtka', sets: [set(12, 35), set(12, 37.5), set(12, 37.5), set(12, 37.5)] },
    ],
  },
  {
    daysAgo: 28, hour: 18, durationMin: 43, planId: 'demo-plan-full', name: 'Celé telo – kondícia',
    exercises: [
      { name: 'Mŕtvy ťah', sets: [set(5, 92.5), set(5, 95), set(5, 95)] },
      { name: 'Tlak s jednoručkami v sede', sets: [set(10, 18), set(10, 20), set(10, 20)] },
      { name: 'Veslovanie na trenažéri', sets: [set(12, 45), set(12, 50), set(12, 50)] },
    ],
  },
]

export function demoSessions(): WorkoutSession[] {
  return SESSION_SPECS.map((spec, i) => {
    const finished = new Date()
    finished.setDate(finished.getDate() - spec.daysAgo)
    finished.setHours(spec.hour, 45, 0, 0)
    const started = new Date(finished.getTime() - spec.durationMin * 60 * 1000)
    const exercises = spec.exercises.map((ex) => {
      const muscleGroup = EXERCISE_MUSCLE_GROUP[ex.name]
      return muscleGroup ? { ...ex, muscleGroup } : ex
    })
    return {
      id: `demo-session-${i + 1}`,
      planId: spec.planId,
      name: spec.name,
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      durationSec: spec.durationMin * 60,
      exercises,
      volume: sessionVolume(exercises),
      isDemo: true,
    }
  })
}
