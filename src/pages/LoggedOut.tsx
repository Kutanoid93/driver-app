import { Link } from 'react-router-dom'

export function LoggedOut() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-slate-900">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Wylogowano</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Do zobaczenia! Zaloguj sie ponownie, aby kontynuowac.
      </p>
      <Link
        to="/login"
        className="rounded-lg bg-blue-700 px-6 py-3 text-base font-medium text-white"
      >
        Wroc do logowania
      </Link>
    </main>
  )
}
