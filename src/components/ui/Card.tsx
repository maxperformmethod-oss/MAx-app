import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Zvýraznená karta (jemný akcentový nádych). */
  tone?: 'default' | 'accent'
  padded?: boolean
}

/** Základný povrch aplikácie. */
export function Card({ children, tone = 'default', padded = true, className = '', ...rest }: CardProps) {
  const toneCls =
    tone === 'accent'
      ? 'border-accent/25 bg-gradient-to-br from-accent/12 via-surface to-surface'
      : 'border-line bg-surface'
  return (
    <div
      className={`rounded-2xl border ${toneCls} ${padded ? 'p-4 sm:p-5' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
