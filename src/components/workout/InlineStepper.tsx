import { Minus, Plus } from 'lucide-react'

interface InlineStepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

/** Kompaktný stepper do riadku série – ovládateľný palcom. */
export function InlineStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  disabled = false,
}: InlineStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100))

  return (
    <div
      className={`flex h-10 items-center overflow-hidden rounded-lg border border-line bg-surface-3 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        aria-label={`Znížiť ${label}`}
        disabled={disabled}
        onClick={() => onChange(clamp(value - step))}
        className="flex h-full w-8 shrink-0 items-center justify-center text-ink-faint hover:text-ink disabled:pointer-events-none"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
      <input
        type="number"
        aria-label={label}
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value.replace(',', '.'))
          if (Number.isFinite(n)) onChange(clamp(n))
        }}
        className="tnum h-full w-full min-w-0 flex-1 bg-transparent text-center text-sm font-bold text-ink outline-none"
      />
      <button
        type="button"
        aria-label={`Zvýšiť ${label}`}
        disabled={disabled}
        onClick={() => onChange(clamp(value + step))}
        className="flex h-full w-8 shrink-0 items-center justify-center text-ink-faint hover:text-ink disabled:pointer-events-none"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
