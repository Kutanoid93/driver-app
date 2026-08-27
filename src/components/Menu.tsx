import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Menu() {
  const [open, setOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    setOpen(false)
    await signOut()
    navigate('/logged-out', { replace: true })
  }

  return (
    <div className="absolute right-4 top-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Wyloguj sie
          </button>
        </div>
      )}
    </div>
  )
}
