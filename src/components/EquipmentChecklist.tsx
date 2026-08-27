import { useEffect, useState } from 'react'
import { getChecklistForRoute } from '../lib/api'
import { updateChecklistItemOffline } from '../lib/offlineActions'
import { showOfflineSavedNotice } from '../lib/offlineNotice'
import type { ChecklistItem } from '../lib/database.types'

interface EquipmentChecklistProps {
  routeId: string | null
  onClose: () => void
}

export function EquipmentChecklist({ routeId, onClose }: EquipmentChecklistProps) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!routeId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await getChecklistForRoute(routeId)
        if (!cancelled) setItems(data)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Nie udalo sie zaladowac checklisty.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [routeId])

  async function handleToggle(item: ChecklistItem, checked: boolean) {
    try {
      const result = await updateChecklistItemOffline(item.id, checked)

      if (result.queued) {
        showOfflineSavedNotice()
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, is_packed: checked, packed_at: checked ? new Date().toISOString() : null }
              : i,
          ),
        )
        return
      }

      setItems((prev) => prev.map((i) => (i.id === result.data.id ? result.data : i)))
    } catch (err) {
      console.error(err)
    }
  }

  const packedCount = items.filter((item) => item.is_packed).length

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Sprzet na trase</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-500 underline dark:text-slate-400"
        >
          Zamknij
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Ladowanie...</p>}

      {!loading && !routeId && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Brak checklisty dla tej zmiany.</p>
      )}

      {!loading && routeId && error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && routeId && !error && (
        <>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {packedCount} / {items.length} zabranych
          </p>

          {items.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Brak pozycji na liscie.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={item.is_packed}
                    onChange={(event) => handleToggle(item, event.target.checked)}
                    aria-label="Zabrane"
                    className="h-5 w-5 shrink-0"
                  />
                  <div className="flex-1">
                    <p
                      className={
                        item.is_packed
                          ? 'text-sm text-slate-400 line-through'
                          : 'text-sm text-slate-900 dark:text-white'
                      }
                    >
                      {item.item_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ilosc: {item.quantity_needed}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
