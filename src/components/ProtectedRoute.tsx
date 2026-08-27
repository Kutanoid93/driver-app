import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-white dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Ladowanie...</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
