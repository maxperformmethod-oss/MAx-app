/**
 * Zdieľateľná karta tréningu – kreslená natívnym canvasom (žiadna knižnica,
 * žiadny screenshot DOM). Renderuje sa priamo v cieľovom rozlíšení
 * (1080×1350 feed / 1080×1920 stories), takže text je ostrý bez ohľadu na
 * devicePixelRatio – náhľad v UI sa len zmenšuje cez CSS.
 * Diakritika (ž š č ť ň á í é…) ide cez ctx.fillText s fontom Inter, ktorý
 * ju plne pokrýva; fallback Segoe UI/system-ui ju pokrýva tiež.
 */

export interface ShareCardData {
  title: string
  dateLabel: string
  durationLabel: string
  exerciseCount: number
  setCount: number
  volumeLabel: string
  /** Predformátované rekordy, napr. { name: 'Mŕtvy ťah', valueLabel: '105 kg × 5' }. */
  records: { name: string; valueLabel: string }[]
  streakDays: number
}

export type ShareCardFormat = 'feed' | 'story'

const W = 1080
const COLORS = {
  bg: '#14130f',
  line: '#2e2b22',
  text: '#f5f1e8',
  muted: '#a8a292',
  faint: '#7a7566',
  accent: '#c9a96a',
}
const FONT_STACK = 'Inter, "Segoe UI", system-ui, sans-serif'
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT_STACK}`

async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  try {
    await Promise.all(
      [
        [400, 40],
        [600, 30],
        [700, 88],
        [800, 150],
      ].map(([w, s]) => document.fonts.load(`${w} ${s}px Inter`)),
    )
  } catch {
    // Inter sa nenačítal (napr. offline) – systémový font zvládne aj diakritiku.
  }
}

type Ctx = CanvasRenderingContext2D

/** Text s ručným letter-spacingom (deterministické naprieč prehliadačmi). */
function drawTracked(ctx: Ctx, text: string, x: number, y: number, tracking: number): void {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + tracking
  }
}

function measureTracked(ctx: Ctx, text: string, tracking: number): number {
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width + tracking
  return Math.max(0, w - tracking)
}

/** Zalomí text na max. počet riadkov; posledný riadok prípadne skráti s „…". */
function wrapLines(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const clamped = lines.slice(0, maxLines)
  let last = `${clamped[maxLines - 1]}…`
  while (ctx.measureText(last).width > maxWidth && last.length > 2) {
    last = `${last.slice(0, -2)}…`
  }
  clamped[maxLines - 1] = last
  return clamped
}

/** Zmenší font, kým sa text nezmestí do šírky (min. hranica kvôli čitateľnosti). */
function fitFontSize(
  ctx: Ctx,
  text: string,
  weight: number,
  startSize: number,
  minSize: number,
  maxWidth: number,
): number {
  let size = startSize
  ctx.font = font(weight, size)
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 6
    ctx.font = font(weight, size)
  }
  return size
}

function ellipsize(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

function hr(ctx: Ctx, x: number, y: number, width: number): void {
  ctx.fillStyle = COLORS.line
  ctx.fillRect(x, y, width, 2)
}

export async function renderShareCard(
  data: ShareCardData,
  format: ShareCardFormat,
): Promise<HTMLCanvasElement> {
  await ensureFonts()
  const H = format === 'story' ? 1920 : 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D kontext nie je dostupný')
  ctx.textBaseline = 'top'

  // Pozadie + tenká akcentová linka hore
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = COLORS.accent
  ctx.fillRect(0, 0, W, 8)

  const PX = 96
  const CW = W - PX * 2
  const footerTop = H - (format === 'story' ? 170 : 130)

  // Story má o dosť viac vertikálneho priestoru – rozostupy roztiahneme.
  const g = format === 'story' ? 1.5 : 1
  const sp = (base: number) => Math.round(base * g)
  let y = format === 'story' ? 300 : 128

  // Eyebrow
  ctx.fillStyle = COLORS.accent
  ctx.font = font(700, 32)
  drawTracked(ctx, 'TRÉNING DOKONČENÝ', PX, y, 9)
  y += sp(70)

  // Názov tréningu (max 2 riadky)
  ctx.fillStyle = COLORS.text
  const titleSize = fitFontSize(ctx, data.title, 700, 84, 56, CW)
  ctx.font = font(700, titleSize)
  const titleLines = wrapLines(ctx, data.title, CW, 2)
  for (const line of titleLines) {
    ctx.fillText(line, PX, y)
    y += Math.round(titleSize * 1.12)
  }
  y += 6

  // Dátum a čas
  ctx.fillStyle = COLORS.muted
  ctx.font = font(400, 38)
  ctx.fillText(data.dateLabel, PX, y)
  y += sp(84)

  hr(ctx, PX, y, CW)
  y += sp(60)

  // Hlavná metrika – celkový objem
  ctx.fillStyle = COLORS.faint
  ctx.font = font(600, 28)
  drawTracked(ctx, 'CELKOVÝ OBJEM', PX, y, 7)
  y += 48
  ctx.fillStyle = COLORS.accent
  const volSize = fitFontSize(ctx, data.volumeLabel, 800, 118, 72, CW)
  ctx.font = font(800, volSize)
  ctx.fillText(data.volumeLabel, PX, y)
  y += volSize + sp(56)

  // Rad štatistík
  const stats = [
    { label: 'DĹŽKA', value: data.durationLabel },
    { label: 'CVIKY', value: String(data.exerciseCount) },
    { label: 'SÉRIE', value: String(data.setCount) },
    { label: 'SÉRIA DNÍ', value: String(data.streakDays) },
  ]
  const colW = CW / stats.length
  stats.forEach((stat, i) => {
    const x = PX + i * colW
    ctx.fillStyle = COLORS.text
    const size = fitFontSize(ctx, stat.value, 700, 52, 30, colW - 24)
    ctx.font = font(700, size)
    ctx.fillText(stat.value, x, y)
    ctx.fillStyle = COLORS.faint
    ctx.font = font(600, 24)
    drawTracked(ctx, stat.label, x, y + 68, 4)
  })
  y += sp(150)

  // Nové osobné rekordy – zobrazíme, koľko sa reálne zmestí nad pätičku
  // (aspoň jeden aj pri dvojriadkovom názve v úzkom feed formáte).
  if (data.records.length > 0) {
    const headerAdvance = 56
    const rowH = 54
    const available = footerTop - y - 24
    const maxRows = Math.floor((available - headerAdvance) / rowH)
    const cap = format === 'story' ? 4 : 3
    const shown = data.records.slice(0, Math.max(0, Math.min(maxRows, cap)))
    if (shown.length > 0) {
      hr(ctx, PX, y, CW)
      y += sp(44)
      ctx.fillStyle = COLORS.accent
      ctx.font = font(700, 26)
      drawTracked(ctx, shown.length === 1 ? 'NOVÝ OSOBNÝ REKORD' : 'NOVÉ OSOBNÉ REKORDY', PX, y, 7)
      y += headerAdvance
      for (const record of shown) {
        ctx.font = font(600, 38)
        ctx.fillStyle = COLORS.accent
        const valueW = ctx.measureText(record.valueLabel).width
        ctx.fillText(record.valueLabel, PX + CW - valueW, y)
        ctx.fillStyle = COLORS.text
        ctx.fillText(ellipsize(ctx, record.name, CW - valueW - 48), PX, y)
        y += rowH
      }
      const hidden = data.records.length - shown.length
      if (hidden > 0) {
        ctx.fillStyle = COLORS.faint
        ctx.font = font(400, 28)
        ctx.fillText(`+ ${hidden} ďalšie`, PX, y)
      }
    }
  }

  // Pätička – diskrétny brand ako na webe
  hr(ctx, PX, footerTop, CW)
  ctx.fillStyle = COLORS.faint
  ctx.font = font(600, 26)
  const brand = 'MPM™ · MAX PERFORM METHOD'
  const brandW = measureTracked(ctx, brand, 8)
  drawTracked(ctx, brand, (W - brandW) / 2, footerTop + 50, 8)

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG sa nepodarilo vytvoriť'))),
      'image/png',
    )
  })
}
