import { openDB, type DBSchema } from 'idb'
import * as api from './api'
import type { TaskStatus } from './database.types'

export type QueueStatus = 'pending' | 'syncing' | 'failed'

interface CreateSessionPayload {
  driverId: string
  vehicleId: string
  trailerId?: string
  startLat?: number
  startLng?: number
}

interface EndSessionPayload {
  sessionId: string
  endLat?: number
  endLng?: number
}

interface UpdateTaskStatusPayload {
  taskId: string
  status: TaskStatus
}

interface UpdateTaskNotesPayload {
  taskId: string
  notes: string
}

interface CreateAdHocTaskPayload {
  description: string
  sessionId?: string
  driverId?: string
  vehicleId?: string
  assignedDate?: string
  priority?: string
}

interface CreateIncidentPayload {
  description: string
  sessionId?: string
  driverId?: string
  vehicleId?: string
  photoUrl?: string
  photoFile?: File
}

interface UpdateChecklistItemPayload {
  itemId: string
  isPacked: boolean
}

interface OperationMap {
  createSession: CreateSessionPayload
  endSession: EndSessionPayload
  updateTaskStatus: UpdateTaskStatusPayload
  updateTaskNotes: UpdateTaskNotesPayload
  createAdHocTask: CreateAdHocTaskPayload
  createIncident: CreateIncidentPayload
  updateChecklistItem: UpdateChecklistItemPayload
}

export type OperationType = keyof OperationMap

export type QueuedOperation = {
  [K in OperationType]: {
    id: number
    type: K
    payload: OperationMap[K]
    createdAt: number
    status: QueueStatus
  }
}[OperationType]

interface OfflineDB extends DBSchema {
  queue: {
    key: number
    value: QueuedOperation
  }
}

const DB_NAME = 'driver-app-offline'
const STORE_NAME = 'queue'
export const QUEUE_CHANGED_EVENT = 'offline-queue-changed'

let dbInstance: ReturnType<typeof openDB<OfflineDB>> | null = null

function dbPromise() {
  if (!dbInstance) {
    dbInstance = openDB<OfflineDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      },
    })
  }
  return dbInstance
}

function notifyQueueChanged() {
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT))
}

export async function enqueueOperation<T extends OperationType>(
  type: T,
  payload: OperationMap[T],
): Promise<void> {
  const db = await dbPromise()
  await db.add(STORE_NAME, {
    type,
    payload,
    createdAt: Date.now(),
    status: 'pending',
  } as QueuedOperation)
  notifyQueueChanged()
}

export async function getQueue(): Promise<QueuedOperation[]> {
  const db = await dbPromise()
  return db.getAll(STORE_NAME)
}

export async function getQueueCounts(): Promise<{ pending: number; failed: number }> {
  const all = await getQueue()
  return {
    pending: all.filter((op) => op.status !== 'failed').length,
    failed: all.filter((op) => op.status === 'failed').length,
  }
}

async function executeOperation(op: QueuedOperation): Promise<void> {
  switch (op.type) {
    case 'createSession':
      await api.createSession(op.payload)
      return
    case 'endSession':
      await api.endSession(op.payload.sessionId, op.payload)
      return
    case 'updateTaskStatus':
      await api.updateTaskStatus(op.payload.taskId, op.payload.status)
      return
    case 'updateTaskNotes':
      await api.updateTaskNotes(op.payload.taskId, op.payload.notes)
      return
    case 'createAdHocTask':
      await api.createAdHocTask(op.payload)
      return
    case 'createIncident': {
      let photoUrl = op.payload.photoUrl
      if (!photoUrl && op.payload.photoFile) {
        photoUrl = await api.uploadIncidentPhoto(op.payload.photoFile, op.payload.driverId ?? '')
      }
      await api.createIncident({ ...op.payload, photoUrl })
      return
    }
    case 'updateChecklistItem':
      await api.updateChecklistItem(op.payload.itemId, op.payload.isPacked)
      return
  }
}

let syncInFlight = false

export async function syncQueue(): Promise<void> {
  if (syncInFlight || !navigator.onLine) return
  syncInFlight = true

  try {
    const db = await dbPromise()
    const ops = await db.getAll(STORE_NAME)

    for (const op of ops) {
      if (!navigator.onLine) break

      await db.put(STORE_NAME, { ...op, status: 'syncing' })
      notifyQueueChanged()

      try {
        await executeOperation(op)
        await db.delete(STORE_NAME, op.id)
      } catch (err) {
        console.error('Nie udalo sie zsynchronizowac operacji', op, err)
        await db.put(STORE_NAME, { ...op, status: 'failed' })
      }

      notifyQueueChanged()
    }
  } finally {
    syncInFlight = false
  }
}
