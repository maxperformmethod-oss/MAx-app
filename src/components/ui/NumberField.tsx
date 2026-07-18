import { useId } from 'react'
import { Minus, Plus } from 'lucide-react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  /** Užšie steppery pre tesné 2-stĺpcové rozloženia (napr. séria v editore tréningu). */
  compact?: boolean
}

/**
 * Číselné pole so steppermi – pohodlné na dotyk jednou rukou.
 * Hodnota nikdy neklesne pod min (žiadne záporné váhy či opakovania).
 */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  compact = false,
}: NumberFieldProps) {
  const id = useId()

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  const setFromString = (raw: string) => {
    const n = Number(raw.replace(',', '.'))
    if (Number.isFinite(n)) onChange(clamp(n))
  }

  const btnWidth = compact ? 'w-8' : 'w-11'

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-dim">
        {label}
      </label>
      <div className="flex h-11 items-stretch overflow-hidden rounded-xl border border-line-strong bg-surface-3">
        <button
          type="button"
          aria-label={`Znížiť ${label}`}
          onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
          className={`flex ${btnWidth} shrink-0 items-center justify-center text-ink-dim hover:bg-line hover:text-ink active:bg-line-strong`}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 border-x border-line">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setFromString(e.target.value)}
            className={`tnum w-full min-w-0 bg-transparent text-center font-semibold text-ink outline-none ${compact ? 'text-sm' : 'text-base'}`}
          />
          {suffix && <span className="pr-2 text-xs text-ink-faint">{suffix}</span>}
        </div>
        <button
          type="button"
          aria-label={`Zvýšiť ${label}`}
          onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
          className={`flex ${btnWidth} shrink-0 items-center justify-center text-ink-dim hover:bg-line hover:text-ink active:bg-line-strong`}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
