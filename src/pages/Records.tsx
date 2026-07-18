import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { exerciseRecords } from '../utils/calc'
import { formatDate, formatKg, plural } from '../utils/format'
import { MUSCLE_GROUP_LABELS } from '../types'

/**
 * Osobné rekordy naprieč celou históriou: pre každý cvik tri nezávislé
 * metriky – odhad 1RM, najťažšia séria a najväčší objem jednej série.
 */
export default function Records() {
  const { data } = useApp()
  const rows = useMemo(() => exerciseRecords(data.sessions), [data.sessions])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h1 className="text-2xl font-bold tracking-tight">Osobné rekordy</h1>
      <p className="mt-1 text-sm text-ink-dim">
        {plural(rows.length, 'cvik s rekordom', 'cviky s rekordmi', 'cvikov s rekordmi')}
      </p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Trophy}
            title="Zatiaľ žiadne rekordy"
            message="Rekordy sa počítajú z dokončených sérií s hmotnosťou – dokonči prvý tréning a objavia sa tu."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <Card key={row.exercise}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate font-bold">{row.exercise}</h2>
                {row.muscleGroup && (
                  <span className="shrink-0 rounded-md bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-dim">
                    {MUSCLE_GROUP_LABELS[row.muscleGroup]}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-accent/25 bg-accent/8 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent-hi">
                    Odhad 1RM
                  </p>
                  {row.best1RM ? (
                    <>
                      <p className="tnum mt-1 text-lg font-extrabold">{formatKg(Math.round(row.best1RM.value * 10) / 10)}</p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        z {formatKg(row.best1RM.weight)} × {row.best1RM.reps} · {formatDate(row.best1RM.date)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-ink-faint">—</p>
                  )}
                </div>
                <div className="rounded-xl border border-line bg-surface-3 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Najťažšia séria
                  </p>
                  {row.heaviestSet ? (
                    <>
                      <p className="tnum mt-1 text-lg font-extrabold">{formatKg(row.heaviestSet.weight)}</p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        × {row.heaviestSet.reps} opak. · {formatDate(row.heaviestSet.date)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-ink-faint">—</p>
                  )}
                </div>
                <div className="rounded-xl border border-line bg-surface-3 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Objem jednej série
                  </p>
                  {row.bestSetVolume ? (
                    <>
                      <p className="tnum mt-1 text-lg font-extrabold">{formatKg(row.bestSetVolume.volume)}</p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {formatKg(row.bestSetVolume.weight)} × {row.bestSetVolume.reps} ·{' '}
                        {formatDate(row.bestSetVolume.date)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-ink-faint">—</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-ink-faint">
        Odhad 1RM je počítaný Epleyho vzorcom (1RM = váha × (1 + opakovania / 30)) a nejde o zmeraný
        výkon. Najťažšia séria = najvyššia hmotnosť dokončenej série. Objem jednej série = opakovania ×
        hmotnosť.
      </p>
    </motion.div>
  )
}
