import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  message: string
  action?: ReactNode
}

/** Kvalitný prázdny stav namiesto prázdnych grafov a zoznamov. */
export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-3 text-ink-dim">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-dim">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
