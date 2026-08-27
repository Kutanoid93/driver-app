import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu } from '../components/Menu'
import { useAuth } from '../hooks/useAuth'
import { getActiveSession, getDriverByEmail } from '../lib/api'

export function Home() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [hasActiveShift, setHasActiveShift] = useState(false)

  // Depend on the stable user id, not the whole `session` object - Supabase
  // replaces that object on every token refresh (roughly hourly, or on tab
  // focus), which would otherwise re-trigger this check with a fresh object
  // reference for no real reason and could race with `checking` staying
  // false from a previous run while the new check is still in flight.
  const userId = session?.user.id

  useEffect(() => {
    let cancelled = false
    setChecking(true)

    async function checkActiveShift() {
      if (!session?.user.email) {
        if (!cancelled) {
          setHasActiveShift(false)
          setChecking(false)
        }
        return
      }

      try {
        const driver = await getDriverByEmail(session.user.email)
        const active = driver ? await getActiveSession(driver.id) : null
        if (!cancelled) setHasActiveShift(Boolean(active))
      } catch (err) {
        console.error('Nie udalo sie sprawdzic aktywnej zmiany', err)
        if (!cancelled) setHasActiveShift(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    checkActiveShift()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-white px-6 text-center dark:bg-slate-900">
      <Menu />

      <img src="/icons/icon.svg" alt="Driver App" className="h-20 w-20" />
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Driver App</h1>

      <button
        type="button"
        disabled={checking}
        onClick={() => navigate(hasActiveShift ? '/shift' : '/start-shift')}
        className="rounded-lg bg-blue-700 px-8 py-4 text-lg font-medium text-white disabled:opacity-60"
      >
        {checking ? 'Ladowanie...' : hasActiveShift ? 'Kontynuuj zmiane' : 'Rozpocznij zmiane'}
      </button>
    </main>
  )
}
