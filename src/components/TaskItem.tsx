import { useEffect, useState } from 'react'
import type { Task } from '../lib/database.types'

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Pilny',
  high: 'Wysoki',
  normal: 'Normalny',
  low: 'Niski',
}

interface TaskItemProps {
  task: Task
  expanded: boolean
  onToggleExpand: () => void
  onToggleDone: (done: boolean) => void
  onSaveNote: (notes: string) => Promise<void>
}

export function TaskItem({ task, expanded, onToggleExpand, onToggleDone, onSaveNote }: TaskItemProps) {
  const [noteDraft, setNoteDraft] = useState(task.notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNoteDraft(task.notes ?? '')
  }, [task.notes])

  async function handleSaveNote() {
    setSaving(true)
    try {
      await onSaveNote(noteDraft)
    } finally {
      setSaving(false)
    }
  }

  const isDone = task.status === 'done'

  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={isDone}
          onChange={(event) => onToggleDone(event.target.checked)}
          aria-label="Zakonczone"
          className="mt-1 h-5 w-5 shrink-0"
        />

        <button type="button" onClick={onToggleExpand} className="flex-1 text-left">
          <p
            className={
              isDone
                ? 'text-base text-slate-400 line-through'
                : 'text-base text-slate-900 dark:text-white'
            }
          >
            {task.description}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.normal
            }`}
          >
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <label htmlFor={`notes-${task.id}`} className="text-sm text-slate-600 dark:text-slate-300">
            Notatka
          </label>
          <textarea
            id={`notes-${task.id}`}
            rows={3}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="np. cos sie stalo po drodze"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSaveNote}
            disabled={saving}
            className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Zapisywanie...' : 'Zapisz notatke'}
          </button>
        </div>
      )}
    </li>
  )
}
