import { useEffect, useRef, useState } from 'react'
import { OFFLINE_NOTICE_EVENT } from '../lib/offlineNotice'

export function OfflineNoticeToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    function handleNotice(event: Event) {
      const detail = (event as CustomEvent<string>).detail
      setMessage(detail)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setMessage(null), 4000)
    }

    window.addEventListener(OFFLINE_NOTICE_EVENT, handleNotice)
    return () => window.removeEventListener(OFFLINE_NOTICE_EVENT, handleNotice)
  }, [])

  if (!message) return null

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-sm rounded-lg bg-amber-100 px-4 py-3 text-center text-sm text-amber-800 shadow-lg dark:bg-amber-950 dark:text-amber-300">
      {message}
    </div>
  )
}
