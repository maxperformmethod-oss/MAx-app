import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Dumbbell,
  Flag,
  ListChecks,
  Share2,
  Trash2,
  Trophy,
  Weight,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/ToastContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ShareResultModal } from '../components/share/ShareResultModal'
import { currentStreak, newRecordsInSession } from '../utils/calc'
import type { ShareCardData } from '../utils/shareCard'
import {
  formatDurationWords,
  formatKg,
  formatLongDate,
  formatTime,
  plural,
} from '../utils/format'

/** Detail dokončeného tréningu; s ?summary=1 slúži ako súhrn hneď po dokončení. */
export default function HistoryDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const isSummary = params.get('summary') === '1'
  const { data, deleteSession } = useApp()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const session = data.sessions.find((s) => s.id === id) ?? null

  const records = useMemo(
    () => (session ? newRecordsInSession(session, data.sessions) : []),
    [session, data.sessions],
  )

  const shareCardData = useMemo<ShareCardData | null>(() => {
    if (!session) return null
    return {
      title: session.name,
      dateLabel: `${formatLongDate(session.finishedAt)} · ${formatTime(session.startedAt)}`,
      durationLabel: formatDurationWords(session.durationSec),
      exerciseCount: session.exercises.length,
      setCount: session.exercises.reduce((n, e) => n + e.sets.length, 0),
      volumeLabel: formatKg(session.volume),
      records: records.map((r) => ({
        name: r.exercise,
        valueLabel: `${formatKg(r.weight)} × ${r.reps}`,
      })),
      streakDays: currentStreak(data.sessions),
    }
  }, [session, records, data.sessions])

  // Porovnanie s predchádzajúcim tréningom rovnakého plánu/názvu.
  const previous = useMemo(() => {
    if (!session) return null
    return (
      data.sessions.find(
        (s) =>
          s.id !== session.id &&
          new Date(s.finishedAt) < new Date(session.finishedAt) &&
          (session.planId ? s.planId === session.planId : s.name === session.name),
      ) ?? null
    )
  }, [session, data.sessions])

  if (!session) {
    return (
      <div className="mx-auto max-w-lg pt-10 text-center">
        <h1 className="text-xl font-bold">Tréning sa nenašiel</h1>
        <p className="mt-2 text-sm text-ink-dim">Záznam mohol byť odstránený.</p>
        <Button className="mt-5" onClick={() => navigate('/history')}>
          Späť na históriu
        </Button>
      </div>
    )
  }

  const setCount = session.exercises.reduce((n, e) => n + e.sets.length, 0)
  const volumeDelta = previous ? session.volume - previous.volume : null

  const stats = [
    { icon: Clock, label: 'Dĺžka', value: formatDurationWords(session.durationSec) },
    { icon: Dumbbell, label: 'Cviky', value: String(session.exercises.length) },
    { icon: ListChecks, label: 'Série', value: String(setCount) },
    { icon: Weight, label: 'Objem', value: formatKg(session.volume) },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl"
    >
      {/* Súhrn po dokončení */}
      {isSummary && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6 rounded-2xl border border-success/30 bg-gradient-to-br from-success/15 via-surface to-surface p-6 text-center"
        >
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-success text-bg">
            <Flag className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold">Tréning dokončený</h1>
          <p className="mt-1.5 text-sm text-ink-dim">
            Skvelá práca. Konzistentnosť je základ progresu.
          </p>
        </motion.div>
      )}

      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          aria-label="Späť na históriu"
          onClick={() => navigate('/history')}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-extrabold">{session.name}</h2>
          <p className="text-xs text-ink-dim">
            {formatLongDate(session.finishedAt)} · {formatTime(session.startedAt)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Odstrániť záznam"
          onClick={() => setConfirmDelete(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="size-5" aria-hidden />
        </button>
      </div>

      {/* Štatistiky */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-3.5 text-center">
            <Icon className="mx-auto mb-1.5 size-4 text-ink-faint" aria-hidden />
            <div className="tnum text-lg font-extrabold leading-tight">{value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Rekordy a porovnanie */}
      {(records.length > 0 || previous) && (
        <div className="mt-3 space-y-3">
          {records.length > 0 && (
            <Card tone="accent">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Trophy className="size-4 text-warning" aria-hidden />
                {plural(records.length, 'Nový osobný rekord', 'Nové osobné rekordy', 'Nových osobných rekordov')}
              </h3>
              <ul className="mt-2.5 space-y-1.5">
                {records.map((r) => (
                  <li key={r.exercise} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{r.exercise}</span>
                    <span className="tnum shrink-0 text-warning">
                      {formatKg(r.weight)} × {r.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {previous && volumeDelta !== null && (
            <Card>
              <h3 className="text-sm font-bold">Porovnanie s minulým tréningom</h3>
              <div className="mt-2 flex items-center gap-2 text-sm">
                {volumeDelta >= 0 ? (
                  <ArrowUpRight className="size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <ArrowDownRight className="size-4 shrink-0 text-danger" aria-hidden />
                )}
                <span className={volumeDelta >= 0 ? 'text-success' : 'text-danger'}>
                  {volumeDelta >= 0 ? '+' : '−'}
                  {formatKg(Math.abs(volumeDelta))} objem
                </span>
                <span className="text-ink-faint">
                  oproti {formatDurationWords(previous.durationSec)} tréningu
                </span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Cviky */}
      <div className="mt-3 space-y-3">
        {session.exercises.map((ex, i) => (
          <Card key={`${ex.name}-${i}`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate font-bold">{ex.name}</h3>
              <span className="tnum shrink-0 text-xs text-ink-faint">
                {plural(ex.sets.length, 'séria', 'série', 'sérií')}
              </span>
            </div>
            {ex.note && <p className="mt-1 text-xs text-ink-dim">{ex.note}</p>}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    <th className="pb-1.5 pr-3 font-bold">Séria</th>
                    <th className="pb-1.5 pr-3 font-bold">Opakovania</th>
                    <th className="pb-1.5 font-bold">Hmotnosť</th>
                  </tr>
                </thead>
                <tbody className="tnum">
                  {ex.sets.map((set, j) => (
                    <tr key={j} className="border-t border-line">
                      <td className="py-1.5 pr-3 text-ink-faint">{j + 1}</td>
                      <td className="py-1.5 pr-3">{set.reps}</td>
                      <td className="py-1.5">{set.weight > 0 ? formatKg(set.weight) : 'Vlastná váha'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      {isSummary && (
        <div className="mt-6 space-y-3">
          <Button size="lg" className="w-full" onClick={() => setShareOpen(true)}>
            <Share2 className="size-5" aria-hidden /> Zdieľať výsledok
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/history')}>
              História
            </Button>
            <Link to="/" className="flex-1">
              <Button variant="secondary" className="w-full">
                Na prehľad
              </Button>
            </Link>
          </div>
        </div>
      )}

      <ShareResultModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={shareCardData}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Odstrániť záznam?"
        message="Tento tréning sa natrvalo odstráni z histórie vrátane všetkých sérií. Akcia sa nedá vrátiť."
        confirmLabel="Odstrániť"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteSession(session.id)
          toast('Záznam bol odstránený.', 'success')
          navigate('/history')
        }}
      />
    </motion.div>
  )
}
