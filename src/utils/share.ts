import type { MuscleGroup, PlanExercise, WorkoutPlan } from '../types'
import { MUSCLE_GROUPS } from '../types'
import { uid } from './id'

/**
 * Zdieľanie tréningového programu odkazom.
 *
 * Plán (iba predpis – žiadna história, rekordy ani nastavenia) sa serializuje
 * do kompaktného JSON so skrátenými kľúčmi, skomprimuje cez
 * CompressionStream('gzip') a zakóduje ako base64url do URL fragmentu:
 *
 *   https://<domena>/import#v=1&c=gz&d=<base64url>
 *
 * Fragment (časť za #) prehliadač NIKDY neposiela na server – dáta programu
 * zostávajú výhradne medzi odosielateľom a príjemcom. Ak CompressionStream
 * nie je dostupný, použije sa nekomprimovaný base64url (bez parametra c).
 *
 * Prijatý obsah je NEDÔVERYHODNÝ vstup z cudzieho zdroja –
 * validateSharedPayload kontroluje schému, typy aj rozsahy a nikdy nepustí
 * ďalej nič, čo neprešlo.
 */

export const SHARE_VERSION = 1
export const MAX_SHARE_URL_LENGTH = 8000
const MAX_EXERCISES = 50
const MAX_SETS = 30
const MAX_NAME = 60
const MAX_NOTE = 140

/** Kompaktný prenosový tvar: n = názov, g = partia, t = poznámka, s = [opakovania, kg][]. */
export interface SharedPlanPayload {
  v: number
  n: string
  e: { n: string; g?: string; t?: string; s: [number, number][] }[]
}

export function planToPayload(plan: WorkoutPlan): SharedPlanPayload {
  return {
    v: SHARE_VERSION,
    n: plan.name,
    e: plan.exercises.map((ex) => ({
      n: ex.name,
      ...(ex.muscleGroup ? { g: ex.muscleGroup } : {}),
      ...(ex.note ? { t: ex.note } : {}),
      s: ex.sets.map((s) => [s.reps, s.weight] as [number, number]),
    })),
  }
}

/* ---------- base64url + gzip ---------- */

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    return Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
  } catch {
    return null
  }
}

async function gzipBytes(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzipBytes(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

/* ---------- kódovanie odkazu ---------- */

export async function encodePlanToFragment(plan: WorkoutPlan): Promise<string> {
  const json = JSON.stringify(planToPayload(plan))
  const bytes = new TextEncoder().encode(json)
  if (typeof CompressionStream !== 'undefined') {
    try {
      const gz = await gzipBytes(bytes)
      return `v=${SHARE_VERSION}&c=gz&d=${toBase64Url(gz)}`
    } catch {
      // gzip zlyhal – pokračuje nekomprimovaný fallback nižšie
    }
  }
  return `v=${SHARE_VERSION}&d=${toBase64Url(bytes)}`
}

export function buildShareUrl(fragment: string): string {
  return `${window.location.origin}/import#${fragment}`
}

/* ---------- dekódovanie a validácia (nedôveryhodný vstup) ---------- */

export interface ShareError {
  error: string
}

export async function decodeShareFragment(hash: string): Promise<{ payload: unknown } | ShareError> {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw.trim()) return { error: 'Odkaz neobsahuje žiadne dáta programu.' }
  const params = new URLSearchParams(raw)
  const v = params.get('v')
  const d = params.get('d')
  const c = params.get('c')
  if (v !== String(SHARE_VERSION)) {
    return { error: 'Odkaz pochádza z nepodporovanej verzie zdieľania.' }
  }
  if (!d) return { error: 'Odkaz je neúplný – chýbajú dáta programu.' }
  const bytes = fromBase64Url(d)
  if (!bytes || bytes.length === 0) return { error: 'Odkaz je poškodený a nedá sa prečítať.' }
  let jsonBytes: Uint8Array<ArrayBuffer> | null = bytes
  if (c === 'gz') {
    if (typeof DecompressionStream === 'undefined') {
      return { error: 'Tento prehliadač nepodporuje čítanie komprimovaného odkazu.' }
    }
    jsonBytes = await gunzipBytes(bytes)
    if (!jsonBytes) return { error: 'Odkaz je poškodený a nedá sa rozbaliť.' }
  }
  try {
    return { payload: JSON.parse(new TextDecoder().decode(jsonBytes)) as unknown }
  } catch {
    return { error: 'Odkaz je poškodený a nedá sa prečítať.' }
  }
}

export interface ValidatedSharedPlan {
  name: string
  exercises: PlanExercise[]
}

/** Prísna validácia cudzieho obsahu – schéma, typy, rozsahy, limity počtu. */
export function validateSharedPayload(raw: unknown): ValidatedSharedPlan | ShareError {
  const fail: ShareError = { error: 'Obsah odkazu nie je platný tréningový program.' }
  if (typeof raw !== 'object' || raw === null) return fail
  const p = raw as Record<string, unknown>
  if (p.v !== SHARE_VERSION) {
    return { error: 'Program pochádza z nepodporovanej verzie zdieľania.' }
  }
  if (typeof p.n !== 'string') return fail
  const name = p.n.trim().slice(0, MAX_NAME)
  if (!name) return fail
  if (!Array.isArray(p.e) || p.e.length === 0) return fail
  if (p.e.length > MAX_EXERCISES) {
    return { error: `Program má priveľa cvikov (maximum je ${MAX_EXERCISES}).` }
  }

  const exercises: PlanExercise[] = []
  for (const item of p.e) {
    if (typeof item !== 'object' || item === null) return fail
    const ex = item as Record<string, unknown>
    if (typeof ex.n !== 'string') return fail
    const exName = ex.n.trim().slice(0, MAX_NAME)
    if (!exName) return fail
    if (!Array.isArray(ex.s) || ex.s.length === 0) return fail
    if (ex.s.length > MAX_SETS) {
      return { error: `Cvik „${exName}" má priveľa sérií (maximum je ${MAX_SETS}).` }
    }
    const sets: PlanExercise['sets'] = []
    for (const s of ex.s) {
      if (!Array.isArray(s) || s.length !== 2) return fail
      const [reps, weight] = s as unknown[]
      if (typeof reps !== 'number' || !Number.isFinite(reps)) return fail
      if (typeof weight !== 'number' || !Number.isFinite(weight)) return fail
      const r = Math.round(reps)
      const w = Math.round(weight * 100) / 100
      if (r < 1 || r > 200 || w < 0 || w > 600) return fail
      sets.push({ id: uid(), reps: r, weight: w })
    }
    const note = typeof ex.t === 'string' ? ex.t.trim().slice(0, MAX_NOTE) : ''
    const mg =
      typeof ex.g === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(ex.g)
        ? (ex.g as MuscleGroup)
        : undefined
    exercises.push({
      id: uid(),
      name: exName,
      sets,
      ...(note ? { note } : {}),
      ...(mg ? { muscleGroup: mg } : {}),
    })
  }
  return { name, exercises }
}

/** Import nikdy neprepisuje – pri zhode názvu pridá sufix „(2)", „(3)"… */
export function uniquePlanName(existingNames: string[], name: string): string {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()))
  if (!taken.has(name.trim().toLowerCase())) return name
  for (let i = 2; i < 100; i++) {
    const candidate = `${name} (${i})`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  return `${name} (${new Date().toISOString().slice(0, 10)})`
}
