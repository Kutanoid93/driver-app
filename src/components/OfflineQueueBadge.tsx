import { useEffect, useState } from 'react'
import { getQueueCounts, QUEUE_CHANGED_EVENT } from '../lib/offlineQueue'

export function OfflineQueueBadge() {
  const [counts, setCounts] = useState({ pending: 0, failed: 0 })

  useEffect(() => {
    let cancelled = false

    function refresh() {
      getQueueCounts().then((next) => {
        if (!cancelled) setCounts(next)
      })
    }

    refresh()
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh)
    return () => {
      cancelled = true
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh)
    }
  }, [])

  const total = counts.pending + counts.failed
  if (total === 0) return null

  const hasFailed = counts.failed > 0

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold text-white shadow-lg ${
        hasFailed ? 'bg-red-600' : 'bg-yellow-500'
      }`}
      title={hasFailed ? 'Niektore operacje nie zostaly zsynchronizowane' : 'Operacje oczekuja na synchronizacje'}
    >
      {total}
    </div>
  )
}
