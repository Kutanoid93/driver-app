import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu } from '../components/Menu'
import { TaskItem } from '../components/TaskItem'
import { IncidentForm } from '../components/IncidentForm'
import { useAuth } from '../hooks/useAuth'
import {
  createAdHocTask,
  createIncident,
  getActiveSession,
  getDriverByEmail,
  getTodayTasksForDriverAndVehicle,
  getVehicleById,
  sortTasksByPriority,
  updateTaskNotes,
  updateTaskStatus,
  uploadIncidentPhoto,
} from '../lib/api'
import type { Driver, Session, Task, Vehicle } from '../lib/database.types'

export function Shift() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [addTaskError, setAddTaskError] = useState<string | null>(null)

  const [showIncidentForm, setShowIncidentForm] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!session?.user.email) return

      try {
        const driverRecord = await getDriverByEmail(session.user.email)
        if (!driverRecord) {
          if (!cancelled) setLoadError('Nie znaleziono profilu kierowcy dla tego konta.')
          return
        }

        const activeSessionRecord = await getActiveSession(driverRecord.id)
        if (!activeSessionRecord) {
          navigate('/', { replace: true })
          return
        }

        const vehicleRecord = await getVehicleById(activeSessionRecord.vehicle_id)
        const todaysTasks = await getTodayTasksForDriverAndVehicle(
          driverRecord.id,
          activeSessionRecord.vehicle_id,
        )

        if (cancelled) return

        setDriver(driverRecord)
        setActiveSession(activeSessionRecord)
        setVehicle(vehicleRecord)
        setTasks(todaysTasks)
      } catch (err) {
        console.error(err)
        if (!cancelled) setLoadError('Nie udalo sie zaladowac danych zmiany.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, navigate])

  async function handleToggleDone(task: Task, done: boolean) {
    try {
      const updated = await updateTaskStatus(task.id, done ? 'done' : 'planned')
      setTasks((prev) => sortTasksByPriority(prev.map((t) => (t.id === updated.id ? updated : t))))
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSaveNote(task: Task, notes: string) {
    const updated = await updateTaskNotes(task.id, notes)
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function handleAddTask(event: FormEvent) {
    event.preventDefault()
    if (!driver || !vehicle || !activeSession || !newTaskDescription.trim()) return

    setAddingTask(true)
    setAddTaskError(null)

    try {
      const created = await createAdHocTask({
        description: newTaskDescription.trim(),
        sessionId: activeSession.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
      })
      setTasks((prev) => sortTasksByPriority([...prev, created]))
      setNewTaskDescription('')
      setShowAddTask(false)
    } catch (err) {
      console.error(err)
      setAddTaskError('Nie udalo sie dodac zadania.')
    } finally {
      setAddingTask(false)
    }
  }

  async function handleIncidentSubmit({
    description,
    file,
  }: {
    description: string
    file: File | null
  }) {
    if (!driver || !vehicle || !activeSession) return

    const photoUrl = file ? await uploadIncidentPhoto(file, driver.id) : undefined

    await createIncident({
      description,
      sessionId: activeSession.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      photoUrl,
    })

    setShowIncidentForm(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-white dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Ladowanie zmiany...</p>
      </main>
    )
  }

  if (loadError || !driver || !vehicle || !activeSession) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-slate-900">
        <p className="text-red-600">{loadError ?? 'Nie udalo sie zaladowac zmiany.'}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg bg-blue-700 px-6 py-3 text-base font-medium text-white"
        >
          Wroc do ekranu glownego
        </button>
      </main>
    )
  }

  return (
    <main className="relative min-h-svh bg-white px-6 py-10 dark:bg-slate-900">
      <Menu />

      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Zmiana w toku</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {vehicle.name} - {vehicle.plate}
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">Zadania na dzis</h2>

          {tasks.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Brak zadan na dzisiaj.</p>
          )}

          <ul className="flex flex-col gap-3">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                expanded={expandedTaskId === task.id}
                onToggleExpand={() =>
                  setExpandedTaskId((id) => (id === task.id ? null : task.id))
                }
                onToggleDone={(done) => handleToggleDone(task, done)}
                onSaveNote={(notes) => handleSaveNote(task, notes)}
              />
            ))}
          </ul>

          {showAddTask ? (
            <form
              onSubmit={handleAddTask}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <label htmlFor="new-task" className="text-sm text-slate-600 dark:text-slate-300">
                Opis zadania
              </label>
              <input
                id="new-task"
                required
                value={newTaskDescription}
                onChange={(event) => setNewTaskDescription(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {addTaskError && <p className="text-sm text-red-600">{addTaskError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingTask}
                  className="flex-1 rounded-lg bg-blue-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {addingTask ? 'Dodawanie...' : 'Dodaj'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  disabled={addingTask}
                  className="rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
                >
                  Anuluj
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-blue-700 dark:border-slate-700 dark:text-blue-400"
            >
              + Dodaj zadanie
            </button>
          )}
        </section>

        <section>
          {showIncidentForm ? (
            <IncidentForm onSubmit={handleIncidentSubmit} onCancel={() => setShowIncidentForm(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setShowIncidentForm(true)}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-medium text-white"
            >
              Zglos awarie
            </button>
          )}
        </section>
      </div>
    </main>
  )
}
