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

// task_type badges use `rounded` (not `rounded-full` like priority) so the
// two categories stay visually distinguishable even where the color palette
// overlaps (e.g. "Demontaz" and priority "Wysoki" are both orange).
const TASK_TYPE_STYLES: Record<string, string> = {
  zaladunek: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  demontaz: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  montaz: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  dostawka: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  relokacja: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

// 'inne' and any other unrecognized value fall through to this gray style
// with the raw value shown as-is (no translated label).
const TASK_TYPE_FALLBACK_STYLE = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'

const TASK_TYPE_LABELS: Record<string, string> = {
  zaladunek: 'Zaladunek',
  demontaz: 'Demontaz',
  montaz: 'Montaz paczkomatu',
  dostawka: 'Dostawka',
  relokacja: 'Relokacja',
}

function formatScheduledTime(value: string): string {
  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5)
  }
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  }
  return value
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
  const locationLine = [task.location_name, task.address].filter(Boolean).join(', ')
  const hasCoordinates = task.gps_lat != null && task.gps_lng != null

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

        <div className="min-w-0 flex-1">
          {(task.task_type || task.scheduled_time) && (
            <div className="mb-1 flex items-center gap-2">
              {task.task_type && (
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    TASK_TYPE_STYLES[task.task_type] ?? TASK_TYPE_FALLBACK_STYLE
                  }`}
                >
                  {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
                </span>
              )}
              {task.scheduled_time && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {formatScheduledTime(task.scheduled_time)}
                </span>
              )}
            </div>
          )}

          <button type="button" onClick={onToggleExpand} className="block w-full text-left">
            <p
              className={
                isDone
                  ? 'text-base text-slate-400 line-through'
                  : 'text-base text-slate-900 dark:text-white'
              }
            >
              {task.description}
            </p>
            {locationLine && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{locationLine}</p>
            )}
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.normal
              }`}
            >
              {PRIORITY_LABELS[task.priority] ?? task.priority}
            </span>
          </button>

          {hasCoordinates && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${task.gps_lat},${task.gps_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm font-medium text-blue-700 underline dark:text-blue-400"
            >
              Nawiguj
            </a>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          {(task.configuration || task.ground_type) && (
            <div className="mb-3 flex flex-col gap-1">
              {task.configuration && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Konfiguracja: {task.configuration}
                </p>
              )}
              {task.ground_type && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Podloze: {task.ground_type}
                </p>
              )}
            </div>
          )}

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
