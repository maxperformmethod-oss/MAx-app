/** Logo MAXPERFORM – čistý textový znak s akcentom. */
export function Logo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="flex size-9 items-center justify-center rounded-xl bg-accent font-black text-bg">
        M
      </span>
    )
  }
  return (
    <span className="flex flex-col leading-none">
      <span className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-base font-black text-bg">
          M
        </span>
        <span className="text-lg font-bold tracking-tight text-ink">MPM™</span>
      </span>
      <span className="mt-1 pl-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
        Max Perform Method
      </span>
    </span>
  )
}
