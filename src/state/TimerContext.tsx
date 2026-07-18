/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface TimerState {
  /** Celková nastavená dĺžka v sekundách. */
  totalSec: number
  /** Zostávajúce sekundy. */
  remaining: number
  running: boolean
  /** Časovač existuje (beží alebo je pozastavený). */
  activeTimer: boolean
  /** Práve dobehol na nulu (na vizuálne upozornenie). */
  finishedFlash: boolean
}

interface TimerContextValue extends TimerState {
  start: (sec: number) => void
  pause: () => void
  resume: () => void
  reset: () => void
  stop: () => void
  addTime: (deltaSec: number) => void
  soundOn: boolean
  setSoundOn: (on: boolean) => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

/**
 * Zvuk cez Web Audio API – AudioContext vzniká až pri používateľskom geste
 * (spustenie časovača), čo rešpektuje autoplay obmedzenia mobilných prehliadačov.
 */
function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null)

  const unlock = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    } catch {
      // Web Audio nie je dostupné – ticho pokračujeme.
    }
  }, [])

  const beep = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx || ctx.state !== 'running') return
    try {
      const now = ctx.currentTime
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0, now + i * 0.35)
        gain.gain.linearRampToValueAtTime(0.4, now + i * 0.35 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.35 + 0.28)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + i * 0.35)
        osc.stop(now + i * 0.35 + 0.3)
      }
    } catch {
      // ignoruj
    }
  }, [])

  return { unlock, beep }
}

export function TimerProvider({
  children,
  soundOn,
  setSoundOn,
}: {
  children: ReactNode
  soundOn: boolean
  setSoundOn: (on: boolean) => void
}) {
  const [totalSec, setTotalSec] = useState(90)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [activeTimer, setActiveTimer] = useState(false)
  const [finishedFlash, setFinishedFlash] = useState(false)
  const endAtRef = useRef<number | null>(null)
  const { unlock, beep } = useBeep()
  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn

  const finish = useCallback(() => {
    setRunning(false)
    setActiveTimer(false)
    setRemaining(0)
    endAtRef.current = null
    setFinishedFlash(true)
    if (soundOnRef.current) beep()
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200])
      } catch {
        // ignoruj
      }
    }
    window.setTimeout(() => setFinishedFlash(false), 2500)
  }, [beep])

  // Odpočet odvodený z cieľového času – presný aj po uspaní karty.
  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (endAtRef.current === null) return
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) finish()
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running, finish])

  const start = useCallback(
    (sec: number) => {
      const s = Math.max(5, Math.round(sec))
      unlock()
      setTotalSec(s)
      setRemaining(s)
      endAtRef.current = Date.now() + s * 1000
      setActiveTimer(true)
      setRunning(true)
      setFinishedFlash(false)
    },
    [unlock],
  )

  const pause = useCallback(() => {
    setRunning(false)
    endAtRef.current = null
  }, [])

  const resume = useCallback(() => {
    setRemaining((left) => {
      if (left <= 0) return left
      endAtRef.current = Date.now() + left * 1000
      setRunning(true)
      return left
    })
    unlock()
  }, [unlock])

  const reset = useCallback(() => {
    setRemaining(totalSec)
    endAtRef.current = running ? Date.now() + totalSec * 1000 : null
  }, [totalSec, running])

  const stop = useCallback(() => {
    setRunning(false)
    setActiveTimer(false)
    setRemaining(0)
    endAtRef.current = null
  }, [])

  const addTime = useCallback((deltaSec: number) => {
    setRemaining((left) => {
      const next = Math.max(0, left + deltaSec)
      if (endAtRef.current !== null) endAtRef.current = Date.now() + next * 1000
      return next
    })
    setTotalSec((t) => Math.max(5, t + deltaSec))
  }, [])

  const value = useMemo<TimerContextValue>(
    () => ({
      totalSec,
      remaining,
      running,
      activeTimer,
      finishedFlash,
      start,
      pause,
      resume,
      reset,
      stop,
      addTime,
      soundOn,
      setSoundOn,
    }),
    [totalSec, remaining, running, activeTimer, finishedFlash, start, pause, resume, reset, stop, addTime, soundOn, setSoundOn],
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer musí byť použitý vo vnútri TimerProvider')
  return ctx
}
