import { useEffect, useState } from 'react'
import { Copy, Download, Share2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../../state/ToastContext'
import {
  canvasToBlob,
  renderShareCard,
  type ShareCardData,
  type ShareCardFormat,
} from '../../utils/shareCard'

interface ShareResultModalProps {
  open: boolean
  onClose: () => void
  data: ShareCardData | null
}

const FORMATS: { key: ShareCardFormat; label: string; hint: string }[] = [
  { key: 'feed', label: 'Príspevok', hint: '4:5' },
  { key: 'story', label: 'Story', hint: '9:16' },
]

/**
 * Zdieľanie výsledku tréningu ako obrázka. Karta sa kreslí lokálne do
 * canvasu – nič sa nikam neposiela, kým používateľ sám nezdieľa.
 */
export function ShareResultModal({ open, onClose, data }: ShareResultModalProps) {
  const { toast } = useToast()
  const [format, setFormat] = useState<ShareCardFormat>('feed')
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !data) return
    let cancelled = false
    setBusy(true)
    setPreview(null)
    setBlob(null)
    ;(async () => {
      try {
        const canvas = await renderShareCard(data, format)
        if (cancelled) return
        setPreview(canvas.toDataURL('image/png'))
        const png = await canvasToBlob(canvas)
        if (!cancelled) setBlob(png)
      } catch {
        if (!cancelled) toast('Obrázok sa nepodarilo vytvoriť.', 'error')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, data, format, toast])

  const makeFile = (source: Blob) =>
    new File([source], `maxperform-trening-${format === 'story' ? '1080x1920' : '1080x1350'}.png`, {
      type: 'image/png',
    })

  const canNativeShare = (() => {
    if (!blob || typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      return false
    }
    if (typeof navigator.canShare === 'function') {
      try {
        return navigator.canShare({ files: [makeFile(blob)] })
      } catch {
        return false
      }
    }
    return true
  })()

  const canCopyImage =
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    typeof ClipboardItem !== 'undefined'

  const nativeShare = async () => {
    if (!blob) return
    try {
      await navigator.share({ files: [makeFile(blob)], title: 'MAXPERFORM – výsledok tréningu' })
    } catch {
      // Zrušené používateľom – žiadna chyba.
    }
  }

  const download = () => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = makeFile(blob).name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
    toast('Obrázok bol stiahnutý.', 'success')
  }

  const copyImage = async () => {
    if (!blob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      toast('Obrázok bol skopírovaný.', 'success')
    } catch {
      toast('Kopírovanie obrázka sa nepodarilo.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Zdieľať výsledok">
      {/* Voľba formátu */}
      <div
        className="flex rounded-xl border border-line bg-surface-3 p-1"
        role="group"
        aria-label="Formát obrázka"
      >
        {FORMATS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={format === f.key}
            onClick={() => setFormat(f.key)}
            className={`h-9 flex-1 rounded-lg text-xs font-bold transition-colors ${
              format === f.key ? 'bg-accent text-bg' : 'text-ink-dim hover:text-ink'
            }`}
          >
            {f.label} <span className="font-semibold opacity-70">{f.hint}</span>
          </button>
        ))}
      </div>

      {/* Náhľad */}
      <div className="mt-4 flex justify-center">
        {preview ? (
          <img
            src={preview}
            alt="Náhľad karty s výsledkom tréningu"
            className="rounded-xl border border-line"
            style={{ maxHeight: 360, width: 'auto' }}
          />
        ) : (
          <div
            role="status"
            className="flex h-72 w-56 items-center justify-center rounded-xl border border-line bg-surface text-xs text-ink-faint"
          >
            {busy ? 'Kreslím kartu…' : 'Náhľad nie je k dispozícii'}
          </div>
        )}
      </div>

      {/* Akcie */}
      <div className="mt-4 space-y-3">
        {canNativeShare && (
          <Button className="w-full" disabled={!blob} onClick={nativeShare}>
            <Share2 className="size-4" aria-hidden /> Zdieľať obrázok
          </Button>
        )}
        <div className="flex gap-3">
          <Button
            variant={canNativeShare ? 'secondary' : 'primary'}
            className="flex-1"
            disabled={!blob}
            onClick={download}
          >
            <Download className="size-4" aria-hidden /> Stiahnuť PNG
          </Button>
          {canCopyImage && (
            <Button variant="secondary" className="flex-1" disabled={!blob} onClick={copyImage}>
              <Copy className="size-4" aria-hidden /> Kopírovať
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        Obrázok sa vytvára priamo v tvojom zariadení a nikam sa neodosiela.
      </p>
    </Modal>
  )
}
