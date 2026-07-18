import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AppProvider, useApp } from './state/AppContext'
import { TimerProvider } from './state/TimerContext'
import { ToastProvider } from './state/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import TrainingList from './pages/TrainingList'
import TrainingEditor from './pages/TrainingEditor'
import WorkoutActive from './pages/WorkoutActive'
import History from './pages/History'
import HistoryDetail from './pages/HistoryDetail'
import Records from './pages/Records'
import TimerPage from './pages/TimerPage'
import Settings from './pages/Settings'

// Grafy (recharts) sú najväčšia časť bundlu – načítavajú sa lenivo.
const Progress = lazy(() => import('./pages/Progress'))

/** Po zmene routy odskroluj hore. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function ChartsFallback() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-ink-dim" role="status">
      Načítavam grafy…
    </div>
  )
}

/** Most medzi AppContext (preferencie) a TimerProviderom. */
function Providers({ children }: { children: React.ReactNode }) {
  const { data, setPrefs } = useApp()
  return (
    <TimerProvider
      soundOn={data.prefs.soundOn}
      setSoundOn={(soundOn) => setPrefs({ soundOn })}
    >
      {children}
    </TimerProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      {/* reducedMotion="user" – rešpektuje prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <AppProvider>
            <Providers>
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/training" element={<TrainingList />} />
                    <Route path="/training/new" element={<TrainingEditor />} />
                    <Route path="/training/:id" element={<TrainingEditor />} />
                    <Route path="/workout" element={<WorkoutActive />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/history/:id" element={<HistoryDetail />} />
                    <Route path="/records" element={<Records />} />
                    <Route
                      path="/progress"
                      element={
                        <Suspense fallback={<ChartsFallback />}>
                          <Progress />
                        </Suspense>
                      }
                    />
                    <Route path="/timer" element={<TimerPage />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Dashboard />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </Providers>
          </AppProvider>
        </ToastProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
