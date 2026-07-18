import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Záchytná sieť – neočakávaná chyba nezhodí celú aplikáciu. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Neošetrená chyba aplikácie:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-surface-3 text-2xl font-black text-ink-dim">
            M
          </span>
          <h1 className="text-xl font-extrabold">Niečo sa pokazilo</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-dim">
            Nastala neočakávaná chyba. Tvoje dáta sú uložené lokálne a zostávajú v bezpečí.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-bg hover:bg-accent-hi"
          >
            Obnoviť aplikáciu
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
