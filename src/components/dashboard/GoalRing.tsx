import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GoalRingProps {
  /** Podiel splnenia, 0–1+ (hodnoty nad 1 sa vizuálne orežú na plný kruh). */
  value: number
  size?: number
  strokeWidth?: number
  children?: ReactNode
  /** Zvýrazní kruh ako splnený (napr. iná farba pri prekročení cieľa). */
  complete?: boolean
}

/**
 * Kruhový ukazovateľ progresu v štýle Apple Fitness / WHOOP – jeden
 * dominantný ring pre týždenný cieľ tréningov na dashboarde.
 * Vyplnenie sa pri prvom vykreslení animuje z 0 na aktuálnu hodnotu.
 */
export function GoalRing({ value, size = 148, strokeWidth = 12, children, complete = false }: GoalRingProps) {
  const clamped = Math.max(0, Math.min(1, value))
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const center = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--color-line)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={complete ? 'var(--color-success)' : 'var(--color-accent)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - clamped) }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
