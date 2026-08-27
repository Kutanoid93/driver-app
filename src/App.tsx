import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { useOfflineSync } from './hooks/useOfflineSync'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OfflineQueueBadge } from './components/OfflineQueueBadge'
import { OfflineNoticeToast } from './components/OfflineNoticeToast'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { LoggedOut } from './pages/LoggedOut'
import { Shift } from './pages/Shift'

const StartShift = lazy(() => import('./pages/StartShift').then((m) => ({ default: m.StartShift })))

function App() {
  useOfflineSync()

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/logged-out" element={<LoggedOut />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/start-shift"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <main className="flex min-h-svh items-center justify-center bg-white dark:bg-slate-900">
                      <p className="text-slate-500 dark:text-slate-400">Ladowanie...</p>
                    </main>
                  }
                >
                  <StartShift />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/shift"
            element={
              <ProtectedRoute>
                <Shift />
              </ProtectedRoute>
            }
          />
        </Routes>
        <OfflineQueueBadge />
        <OfflineNoticeToast />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
