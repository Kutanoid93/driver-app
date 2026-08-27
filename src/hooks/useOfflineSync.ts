import { useEffect } from 'react'
import { syncQueue } from '../lib/offlineQueue'

export function useOfflineSync() {
  useEffect(() => {
    if (navigator.onLine) {
      syncQueue()
    }

    function handleOnline() {
      syncQueue()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])
}
