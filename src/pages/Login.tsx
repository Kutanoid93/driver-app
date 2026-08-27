import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (signInError) {
      setError('Nieprawidlowy email lub haslo')
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-white px-6 dark:bg-slate-900">
      <img src="/icons/icon.svg" alt="Driver App" className="h-16 w-16" />

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-center text-2xl font-semibold text-slate-900 dark:text-white">
          Logowanie kierowcy
        </h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm text-slate-600 dark:text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-slate-600 dark:text-slate-300">
            Haslo
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-700 px-4 py-3 text-base font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Logowanie...' : 'Zaloguj sie'}
        </button>
      </form>
    </main>
  )
}
