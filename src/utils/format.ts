const DAY_MS = 24 * 60 * 60 * 1000

/** Začiatok dňa (lokálny čas). */
export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Kľúč dňa vo formáte YYYY-MM-DD (lokálny čas). */
export function dayKey(d: Date | string): string {
  const x = new Date(d)
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${x.getFullYear()}-${m}-${day}`
}

/** „Pondelok 17. júla" – dlhý slovenský dátum s veľkým prvým písmenom. */
export function formatLongDate(d: Date | string): string {
  const s = new Date(d).toLocaleDateString('sk-SK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** „17. 7. 2026" */
export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/** „18:24" */
export function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
}

/** „Dnes" / „Včera" / „17. 7. 2026" */
export function formatRelativeDay(d: Date | string): string {
  const today = startOfDay(new Date()).getTime()
  const day = startOfDay(new Date(d)).getTime()
  const diff = Math.round((today - day) / DAY_MS)
  if (diff === 0) return 'Dnes'
  if (diff === 1) return 'Včera'
  if (diff > 1 && diff < 7) return `Pred ${diff} dňami`
  return formatDate(d)
}

/** Trvanie „48:12" alebo „1:02:45" pre dlhé tréningy. */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Trvanie slovom: „48 min" / „1 h 12 min". */
export function formatDurationWords(totalSec: number): string {
  const m = Math.max(1, Math.round(totalSec / 60))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`
}

/** „1 250 kg" – hmotnosť/objem so slovenským oddeľovačom tisícov. */
export function formatKg(kg: number): string {
  return `${kg.toLocaleString('sk-SK', { maximumFractionDigits: 1 })} kg`
}

/** Kompaktný objem pre úzke štítky – nad 1000 kg prepne na tony, napr. „55,1 t". */
export function formatKgCompact(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString('sk-SK', { maximumFractionDigits: 1 })} t`
  }
  return formatKg(kg)
}

/** Pozdrav podľa dennej doby. */
export function greeting(): string {
  const h = new Date().getHours()
  if (h < 4) return 'Dobrú noc'
  if (h < 10) return 'Dobré ráno'
  if (h < 18) return 'Pekný deň'
  return 'Dobrý večer'
}

/** Skloňovanie: 1 tréning, 2 tréningy, 5 tréningov. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return `${n} ${one}`
  if (n >= 2 && n <= 4) return `${n} ${few}`
  return `${n} ${many}`
}
