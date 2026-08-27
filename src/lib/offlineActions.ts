import * as api from './api'
import { enqueueOperation } from './offlineQueue'
import { isNetworkError } from './network'
import type { ChecklistItem, Incident, Session, Task, TaskStatus } from './database.types'

export type OfflineResult<T> = { queued: true } | { queued: false; data: T }

export async function createSessionOffline(
  params: Parameters<typeof api.createSession>[0],
): Promise<OfflineResult<Session>> {
  try {
    return { queued: false, data: await api.createSession(params) }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueOperation('createSession', params)
    return { queued: true }
  }
}

export async function endSessionOffline(
  sessionId: string,
  params: Parameters<typeof api.endSession>[1] = {},
): Promise<OfflineResult<Session>> {
  try {
    return { queued: false, data: await api.endSession(sessionId, params) }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueOperation('endSession', { sessionId, ...params })
    return { queued: true }
  }
}

export async function updateTaskStatusOffline(
  taskId: string,
  status: TaskStatus,
): Promise<OfflineResult<Task>> {
  try {
    return { queued: false, data: await api.updateTaskStatus(taskId, status) }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueOperation('updateTaskStatus', { taskId, status })
    return { queued: true }
  }
}

export async function updateTaskNotesOffline(
  taskId: string,
  notes: string,
): Promise<OfflineResult<Task>> {
  try {
    return { queued: false, data: await api.updateTaskNotes(taskId, notes) }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueOperation('updateTaskNotes', { taskId, notes })
    return { queued: true }
  }
}

export async function createAdHocTaskOffline(
  params: Parameters<typeof api.createAdHocTask>[0],
): Promise<OfflineResult<Task>> {
  try {
    return { queued: false, data: await api.createAdHocTask(params) }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueOperation('createAdHocTask', params)
    return { queued: true }
  }
}

export async function updateChecklistItemOffline(
  itemId: string,
  isPacked: boolean,
): Promise<OfflineResult<ChecklistItem>> {
  try {
    return { queued: false, data: await api.updateChecklistItem(itemId, isPacked) }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueOperation('updateChecklistItem', { itemId, isPacked })
    return { queued: true }
  }
}

export async function createIncidentOffline(params: {
  description: string
  sessionId?: string
  driverId?: string
  vehicleId?: string
  file: File | null
}): Promise<OfflineResult<Incident>> {
  const { file, ...rest } = params

  try {
    const photoUrl = file ? await api.uploadIncidentPhoto(file, rest.driverId ?? '') : undefined
    return { queued: false, data: await api.createIncident({ ...rest, photoUrl }) }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueOperation('createIncident', { ...rest, photoFile: file ?? undefined })
    return { queued: true }
  }
}
