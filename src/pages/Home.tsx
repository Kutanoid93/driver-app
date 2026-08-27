import { useNavigate } from 'react-router-dom'
import { Menu } from '../components/Menu'

export function Home() {
  const navigate = useNavigate()

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-white px-6 text-center dark:bg-slate-900">
      <Menu />

      <img src="/icons/icon.svg" alt="Driver App" className="h-20 w-20" />
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Driver App</h1>

      <button
        type="button"
        onClick={() => navigate('/start-shift')}
        className="rounded-lg bg-blue-700 px-8 py-4 text-lg font-medium text-white"
      >
        Rozpocznij zmiane
      </button>
    </main>
  )
}
