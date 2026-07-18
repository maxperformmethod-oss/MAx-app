/* eslint-disable react-refresh/only-export-components */
/** Zdieľané vizuálne nastavenie grafov – čisté, tmavé, minimum čiar. */

export const AXIS_PROPS = {
  stroke: 'transparent',
  tick: { fill: 'var(--color-ink-faint)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const GRID_PROPS = {
  stroke: 'var(--color-line)',
  strokeDasharray: '3 6',
  vertical: false,
} as const

interface TooltipPayloadItem {
  value?: number | string
  name?: string
}

interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: TooltipPayloadItem[]
  /** Formátovanie hodnoty (napr. pridanie „kg"). */
  format?: (value: number) => string
}

/** Jednotný tooltip pre všetky grafy. */
export function ChartTooltip({ active, label, payload, format }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const raw = payload[0]?.value
  const value = typeof raw === 'number' ? raw : Number(raw ?? 0)
  return (
    <div className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2 shadow-lg shadow-black/40">
      <p className="text-[11px] font-semibold text-ink-faint">{label}</p>
      <p className="tnum text-sm font-extrabold text-ink">
        {format ? format(value) : value.toLocaleString('sk-SK')}
      </p>
    </div>
  )
}
