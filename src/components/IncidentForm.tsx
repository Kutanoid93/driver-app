import { useState, type FormEvent } from 'react'

interface IncidentFormProps {
  onSubmit: (params: { description: string; file: File }) => Promise<void>
  onCancel: () => void
}

export function IncidentForm({ onSubmit, onCancel }: IncidentFormProps) {
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!file) {
      setError('Dodaj zdjecie awarii.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({ description: description.trim(), file })
    } catch (err) {
      console.error(err)
      setError('Nie udalo sie zglosic awarii. Sprobuj ponownie.')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
    >
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Zglos awarie</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="incident-description" className="text-sm text-slate-600 dark:text-slate-300">
          Opis
        </label>
        <textarea
          id="incident-description"
          rows={3}
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="incident-photo" className="text-sm text-slate-600 dark:text-slate-300">
          Zdjecie
        </label>
        <input
          id="incident-photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="text-sm text-slate-600 dark:text-slate-300"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Zglaszanie...' : 'Zglos'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
        >
          Anuluj
        </button>
      </div>
    </form>
  )
}
