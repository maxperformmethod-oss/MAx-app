import type { LucideIcon } from 'lucide-react'

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  accent?: boolean
}

/** Kompaktná štatistická dlaždica dashboardu. */
export function StatTile({ icon: Icon, label, value, hint, accent = false }: StatTileProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex size-7 items-center justify-center rounded-lg ${
            accent ? 'bg-accent/15 text-accent-hi' : 'bg-surface-3 text-ink-dim'
          }`}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </span>
      </div>
      <span className="tnum text-2xl font-extrabold leading-none">{value}</span>
      {hint && <span className="mt-1.5 text-xs text-ink-dim">{hint}</span>}
    </div>
  )
}
