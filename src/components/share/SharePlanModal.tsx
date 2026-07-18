import { useEffect, useState } from 'react'
import { Copy, Download, Share2, TriangleAlert } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../../state/ToastContext'
import {
  MAX_SHARE_URL_LENGTH,
  buildShareUrl,
  encodePlanToFragment,
  planToPayload,
} from '../../utils/share'
import { plural } from '../../utils/format'
import type { QRCodeToDataURLOptions } from 'qrcode'
import type { WorkoutPlan } from '../../types'

type QrToDataUrl = (text: string, opts?: QRCodeToDataURLOptions) => Promise<string>

interface SharePlanModalProps {
  plan: WorkoutPlan | null
  open: boolean
  onClose: () => void
}

/**
 * Zdieľanie tréningového programu: odkaz s dátami vo fragmente (nič sa
 * neposiela na server), QR kód generovaný lokálne a natívne zdieľanie.
 */
export function SharePlanModal({ plan, open, onClose }: SharePlanModalProps) {
  const { toast } = useToast()
  const [url, setUrl] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [tooLong, setTooLong] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !plan) return
    let cancelled = false
    setUrl(null)
    setQr(null)
    setTooLong(false)
    setBusy(true)
    ;(async () => {
      try {
        const fragment = await encodePlanToFragment(plan)
        const shareUrl = buildShareUrl(fragment)
        if (cancelled) return
        if (shareUrl.length > MAX_SHARE_URL_LENGTH) {
          setTooLong(true)
          return
        }
        setUrl(shareUrl)
        // QR generujeme výhradne lokálne (žiadna externá služba). Farby appky:
        // akcentové moduly na tmavom pozadí s tichou zónou 4 modulov –
        // kontrast ~8:1, inverzné QR moderné skenery čítajú spoľahlivo.
        try {
          // qrcode je CommonJS – Vite môže pomenované exporty vystaviť na .default.
          const mod = (await import('qrcode')) as unknown as {
            toDataURL?: QrToDataUrl
            default?: { toDataURL?: QrToDataUrl }
          }
          const toDataURL = mod.toDataURL ?? mod.default?.toDataURL
          if (toDataURL) {
            const dataUrl = await toDataURL(shareUrl, {
              errorCorrectionLevel: 'M',
              margin: 4,
              width: 560,
              color: { dark: '#c9a96a', light: '#14130f' },
            })
            if (!cancelled) setQr(dataUrl)
          }
        } catch {
          // Odkaz sa nezmestil do kapacity QR – zostane iba textový odkaz.
        }
      } catch {
        if (!cancelled) toast('Odkaz sa nepodarilo vytvoriť.', 'error')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, plan, toast])

  if (!plan) return null

  const setCount = plan.exercises.reduce((n, e) => n + e.sets.length, 0)
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast('Odkaz bol skopírovaný.', 'success')
    } catch {
      toast('Kopírovanie sa nepodarilo.', 'error')
    }
  }

  const nativeShare = async () => {
    if (!url) return
    try {
      await navigator.share({ title: `MAXPERFORM – ${plan.name}`, url })
    } catch {
      // Zrušené používateľom alebo nepodporované – žiadna chyba.
    }
  }

  const exportJsonFile = () => {
    const payload = planToPayload(plan)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `maxperform-program-${plan.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
    toast('Program bol exportovaný do JSON súboru.', 'success')
  }

  return (
    <Modal open={open} onClose={onClose} title="Zdieľať program">
      {/* Náhľad programu */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="truncate font-bold">{plan.name}</p>
        <p className="mt-0.5 text-xs text-ink-dim">
          {plural(plan.exercises.length, 'cvik', 'cviky', 'cvikov')} ·{' '}
          {plural(setCount, 'séria', 'série', 'sérií')}
        </p>
        <ul className="mt-2 space-y-0.5 text-xs text-ink-dim">
          {plan.exercises.slice(0, 3).map((ex) => (
            <li key={ex.id} className="truncate">
              {ex.name} · {ex.sets.length}×{ex.sets[0]?.reps ?? 0}
            </li>
          ))}
          {plan.exercises.length > 3 && (
            <li className="text-ink-faint">
              + {plural(plan.exercises.length - 3, 'ďalší cvik', 'ďalšie cviky', 'ďalších cvikov')}
            </li>
          )}
        </ul>
      </div>

      {tooLong ? (
        <div className="mt-4">
          <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm leading-relaxed text-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            Tento program je na zdieľanie odkazom príliš veľký. Exportuj ho ako JSON súbor –
            príjemca ho načíta na stránke importu.
          </p>
          <Button className="mt-3 w-full" onClick={exportJsonFile}>
            <Download className="size-4" aria-hidden /> Exportovať JSON
          </Button>
        </div>
      ) : (
        <>
          {/* QR kód */}
          <div className="mt-4 flex justify-center">
            {qr ? (
              <img
                src={qr}
                alt={`QR kód s odkazom na program ${plan.name}`}
                className="size-52 rounded-2xl border border-line"
              />
            ) : (
              <div
                className="flex size-52 items-center justify-center rounded-2xl border border-line bg-surface text-xs text-ink-faint"
                role="status"
              >
                {busy ? 'Generujem odkaz…' : 'QR kód nie je k dispozícii'}
              </div>
            )}
          </div>

          {/* Odkaz */}
          <div className="mt-4">
            <label htmlFor="share-plan-url" className="mb-1.5 block text-xs font-medium text-ink-dim">
              Odkaz na program
            </label>
            <input
              id="share-plan-url"
              readOnly
              value={url ?? ''}
              placeholder={busy ? 'Generujem…' : ''}
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 w-full rounded-xl border border-line-strong bg-surface-3 px-3.5 text-xs text-ink-dim outline-none focus:border-accent"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <Button className="flex-1" disabled={!url} onClick={copyLink}>
              <Copy className="size-4" aria-hidden /> Kopírovať odkaz
            </Button>
            {canNativeShare && (
              <Button variant="secondary" className="flex-1" disabled={!url} onClick={nativeShare}>
                <Share2 className="size-4" aria-hidden /> Zdieľať
              </Button>
            )}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Dáta programu sú priamo v odkaze (za znakom #) a neposielajú sa na žiadny server.
            Príjemca si program uloží až po vlastnom potvrdení.
          </p>
        </>
      )}
    </Modal>
  )
}
