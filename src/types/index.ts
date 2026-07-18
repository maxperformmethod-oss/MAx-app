/** Svalová partia, ku ktorej môže byť cvik voliteľne priradený. */
export const MUSCLE_GROUPS = [
  'nohy',
  'chrbat',
  'hrud',
  'ramena',
  'ruky',
  'core',
  'cele-telo',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  nohy: 'Nohy',
  chrbat: 'Chrbát',
  hrud: 'Hruď',
  ramena: 'Ramená',
  ruky: 'Ruky',
  core: 'Core',
  'cele-telo': 'Celé telo',
}

/** Cvik bez priradenej partie sa v štatistikách zobrazuje pod týmto názvom. */
export const UNASSIGNED_MUSCLE_GROUP_LABEL = 'Nezaradené'

/** Jedna plánovaná séria cviku v tréningovom pláne. */
export interface PlannedSet {
  id: string
  reps: number
  weight: number
}

/** Cvik v tréningovom pláne. */
export interface PlanExercise {
  id: string
  name: string
  note?: string
  /** Voliteľné zaradenie do svalovej partie – pre štatistiky objemu. */
  muscleGroup?: MuscleGroup
  sets: PlannedSet[]
}

/** Tréningový plán vytvorený používateľom. */
export interface WorkoutPlan {
  id: string
  name: string
  exercises: PlanExercise[]
  createdAt: string
  updatedAt: string
  isDemo?: boolean
}

/** Séria počas aktívneho tréningu. */
export interface ActiveSet {
  id: string
  reps: number
  weight: number
  done: boolean
}

/** Cvik počas aktívneho tréningu. */
export interface ActiveExercise {
  id: string
  name: string
  note?: string
  muscleGroup?: MuscleGroup
  sets: ActiveSet[]
}

/** Práve prebiehajúci tréning – prežije obnovenie stránky. */
export interface ActiveWorkout {
  planId: string | null
  name: string
  startedAt: string
  exercises: ActiveExercise[]
}

/** Dokončená séria uložená v histórii. */
export interface SessionSet {
  reps: number
  weight: number
}

/** Cvik uložený v histórii. */
export interface SessionExercise {
  name: string
  note?: string
  muscleGroup?: MuscleGroup
  sets: SessionSet[]
}

/** Dokončený tréning v histórii. */
export interface WorkoutSession {
  id: string
  planId: string | null
  name: string
  startedAt: string
  finishedAt: string
  durationSec: number
  exercises: SessionExercise[]
  /** Celkový objem = súčet (opakovania × hmotnosť) dokončených sérií. */
  volume: number
  isDemo?: boolean
}

/** Používateľské preferencie. */
export interface Preferences {
  /** Predvolená dĺžka odpočinku v sekundách. */
  restSec: number
  soundOn: boolean
  /** Či už používateľ prešiel úvodnou voľbou (prázdna appka / demo). */
  onboarded: boolean
  /** Týždenný cieľ počtu tréningov (zobrazený ako hlavný ring na dashboarde). */
  weeklyGoal: number
}

/**
 * Koreňový objekt všetkých lokálnych dát – verzovaný pre budúce migrácie.
 * v2 pridáva `prefs.weeklyGoal` a voliteľné `muscleGroup` na cvikoch;
 * staré dáta (v1) bez týchto polí sú spätne kompatibilné – sanitizeData
 * im doplní bezpečné predvolené hodnoty (weeklyGoal: 3, muscleGroup: nezaradené).
 */
export interface AppData {
  version: 2
  plans: WorkoutPlan[]
  sessions: WorkoutSession[]
  active: ActiveWorkout | null
  prefs: Preferences
}

/** Osobný rekord: najvyššia hmotnosť dokončenej série daného cviku. */
export interface PersonalRecord {
  exercise: string
  weight: number
  reps: number
  date: string
}

/**
 * Súhrnný rekordný riadok pre stránku /records – tri nezávislé metriky
 * naprieč celou históriou daného cviku.
 */
export interface ExerciseRecordRow {
  exercise: string
  muscleGroup?: MuscleGroup
  /** Najlepší odhad 1RM (Epleyho vzorec) spomedzi všetkých dokončených sérií. */
  best1RM: { value: number; weight: number; reps: number; date: string } | null
  /** Najťažšia jednotlivá dokončená séria (podľa hmotnosti, pri zhode podľa opakovaní). */
  heaviestSet: { weight: number; reps: number; date: string } | null
  /** Najväčší objem jednej série (opakovania × hmotnosť). */
  bestSetVolume: { volume: number; weight: number; reps: number; date: string } | null
}
