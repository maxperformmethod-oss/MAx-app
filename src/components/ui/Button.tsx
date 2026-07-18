import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-bg hover:bg-accent-hi active:bg-accent-dim shadow-[0_4px_16px_-4px_rgba(201,169,106,0.45)]',
  secondary:
    'bg-surface-3 text-ink border border-line-strong hover:bg-line active:bg-line-strong',
  ghost: 'bg-transparent text-ink-dim hover:text-ink hover:bg-surface-2 active:bg-surface-3',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 active:bg-danger/25',
  success:
    'bg-success text-bg hover:brightness-110 active:brightness-95 shadow-[0_4px_16px_-4px_rgba(127,185,138,0.4)]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-6 text-base gap-2',
}

/** Základné tlačidlo – min. dotyková plocha 44 px pri md/lg. */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors duration-150 select-none disabled:opacity-45 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
