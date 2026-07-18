import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, FileJson, Inbox, Link2, TriangleAlert, X } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  decodeShareFragment,
  uniquePlanName,
  validateSharedPayload,
  type ValidatedSharedPlan,
} from '../utils/share'
import { formatKg, plural } from '../utils/format'
import { uid } from '../utils/id'
import { MUSCLE_GROUP_LABELS } from '../types'
import type { WorkoutPlan } from '../types'

type ImportState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; plan: ValidatedSharedPlan }

/**
 * Import zdieľaného programu. Obsah odkazu je nedôveryhodný vstup – vždy sa
 * najprv zobrazí náhľad a program sa uloží až po výslovnom potvrdení.
 * Import nikdy neprepíše existujúci plán (pri zhode názvu dostane sufix).
 */
export default function ImportPlan() {
  const location = useLocation()
  const { data, savePlan } = useApp()
  const { toast } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportState>({ kind: 'idle' })
  const [pasted, setPasted] = useState('')

  const processFragment = useCallback(async (hash: string) => {
    setState({ kind: 'loading' })
    const decoded = await decodeShareFragment(hash)
    if ('error' in decoded) {
      setState({ kind: 'error', message: decoded.error })
      return
    }
    const validated = validateSharedPayload(decoded.payload)
    if ('error' in validated) {
      setState({ kind: 'error', message: validated.error })
      return
    }
    setState({ kind: 'preview', plan: validated })
  }, [])

  useEffect(() => {
    if (location.hash && location.hash.length > 1) {
      void processFragment(location.hash)
    }
  }, [location.hash, processFragment])

  const handlePasted = () => {
    const text = pasted.trim()
    if (!text) return
    const hashIndex = text.indexOf('#')
    if (hashIndex >= 0) {
      void processFragment(text.slice(hashIndex))
    } else if (text.startsWith('v=')) {
      void processFragment(text)
    } else {
      setState({ kind: 'error', message: 'Vložený text nevyzerá ako odkaz na program.' })
    }
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(typeof reader.result === 'string' ? reader.result : '')
        const validated = validateSharedPayload(parsed)
        if ('error' in validated) setState({ kind: 'error', message: validated.error })
        else setState({ kind: 'preview', plan: validated })
      } catch {
        setState({ kind: 'error', message: 'Súbor nie je platný JSON s programom.' })
      }
    }
    reader.onerror = () => setState({ kind: 'error', message: 'Súbor sa nepodarilo prečítať.' })
    reader.readAsText(file)
  }

  const confirmImport = () => {
    if (state.kind !== 'preview') return
    const name = uniquePlanName(
      data.plans.map((p) => p.name),
      state.plan.name,
    )
    const now = new Date().toISOString()
    const plan: WorkoutPlan = {
      id: uid(),
      name,
      exercises: state.plan.exercises,
      createdAt: now,
      updatedAt: now,
    }
    savePlan(plan)
    toast(`Program „${name}" bol pridaný do tvojich tréningov.`, 'success')
    navigate(`/training/${plan.id}`, { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-2xl"
    >
      <h1 className="text-2xl font-bold tracking-tight">Import programu</h1>
      <p className="mt-1 text-sm text-ink-dim">
        Zdieľaný tréningový program sa uloží až po tvojom potvrdení.
      </p>

      {state.kind === 'loading' && (
        <Card className="mt-6 text-center text-sm text-ink-dim" role="status">
          Načítavam program z odkazu…
        </Card>
      )}

      {state.kind === 'error' && (
        <Card className="mt-6 border-danger/30">
          <p className="flex items-start gap-2.5 text-sm leading-relaxed">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <span>
              <span className="font-bold text-danger">Program sa nedá načítať.</span>
              <br />
              <span className="text-ink-dim">{state.message}</span>
            </span>
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setState({ kind: 'idle' })}>
              Skúsiť iný odkaz
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => navigate('/training')}>
              Späť na tréningy
            </Button>
          </div>
        </Card>
      )}

      {state.kind === 'preview' && (
        <>
          <Card tone="accent" className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-hi">
              Náhľad programu
            </p>
            <h2 className="mt-1.5 text-xl font-bold">{state.plan.name}</h2>
            <p className="mt-1 text-sm text-ink-dim">
              {plural(state.plan.exercises.length, 'cvik', 'cviky', 'cvikov')} ·{' '}
              {plural(
                state.plan.exercises.reduce((n, e) => n + e.sets.length, 0),
                'séria',
                'série',
                'sérií',
              )}
            </p>
          </Card>

          <div className="mt-3 space-y-2">
            {state.plan.exercises.map((ex, i) => (
              <Card key={ex.id} padded={false} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-extrabold text-ink-dim">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-semibold">{ex.name}</span>
                    {ex.muscleGroup && (
                      <span className="shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                        {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                      </span>
                    )}
                  </div>
                  <span className="tnum shrink-0 text-xs text-ink-dim">
                    {ex.sets.length}× {ex.sets[0]?.reps ?? 0} op.
                    {(ex.sets[0]?.weight ?? 0) > 0 ? ` · ${formatKg(ex.sets[0].weight)}` : ''}
                  </span>
                </div>
                {ex.note && <p className="mt-1.5 pl-8 text-xs text-ink-dim">{ex.note}</p>}
              </Card>
            ))}
          </div>

          <div className="mt-5 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setState({ kind: 'idle' })
                navigate('/import', { replace: true })
              }}
            >
              <X className="size-4" aria-hidden /> Zrušiť
            </Button>
            <Button className="flex-1" onClick={confirmImport}>
              <Check className="size-4" aria-hidden /> Pridať do mojich tréningov
            </Button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Import vytvorí nový plán – tvoje existujúce tréningy zostanú nedotknuté.
          </p>
        </>
      )}

      {state.kind === 'idle' && (
        <div className="mt-6 space-y-3">
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Link2 className="size-4 text-ink-dim" aria-hidden />
              Vložiť odkaz
            </h2>
            <p className="mt-1 text-xs text-ink-dim">
              Otvor zdieľaný odkaz priamo, alebo ho sem vlož.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePasted()
                }}
                placeholder="https://…/import#v=1&d=…"
                aria-label="Odkaz na zdieľaný program"
                className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface-3 px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
              />
              <Button onClick={handlePasted} disabled={!pasted.trim()}>
                Načítať
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <FileJson className="size-4 text-ink-dim" aria-hidden />
              Načítať JSON súbor
            </h2>
            <p className="mt-1 text-xs text-ink-dim">
              Pre veľké programy exportované ako súbor.
            </p>
            <Button variant="secondary" className="mt-3" onClick={() => fileRef.current?.click()}>
              <Inbox className="size-4" aria-hidden /> Vybrať súbor
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Vybrať JSON súbor s programom"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
          </Card>
        </div>
      )}
    </motion.div>
  )
}
