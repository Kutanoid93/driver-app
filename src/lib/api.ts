import { supabase } from './supabase'
import type {
  Driver,
  Vehicle,
  Trailer,
  Session,
  Task,
  TaskStatus,
  Incident,
  ChecklistItem,
} from './database.types'

export async function getDriverByEmail(email: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getVehicleByQrCode(qrCode: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('qr_code', qrCode)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getAvailableVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'available')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function getTrailers(): Promise<Trailer[]> {
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getDriverById(id: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getOtherDrivers(excludeDriverId: string): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .neq('id', excludeDriverId)
    .order('full_name', { ascending: true })

  if (error) throw error
  return data
}

export async function getActiveSession(driverId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .or(`driver_id.eq.${driverId},co_driver_id.eq.${driverId}`)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

// Best-effort side effect of starting/ending a session - a failure here must
// never fail the session create/end itself, so errors are swallowed and only
// logged.
async function setVehicleStatus(vehicleId: string, status: string): Promise<void> {
  try {
    const { error } = await supabase.from('vehicles').update({ status }).eq('id', vehicleId)
    if (error) throw error
  } catch (err) {
    console.error('Nie udalo sie zaktualizowac statusu pojazdu', err)
  }
}

// The route currently assigned to a vehicle - if it has more than one
// (e.g. left over from different weeks), the one with the highest
// week_number is the current one; ties broken by most recently created.
// Not wrapped in try/catch: letting a real network error propagate here
// (rather than swallowing it) is what lets createSessionOffline's offline
// fallback kick in, same as a failure from the session insert itself would.
async function findCurrentRouteId(vehicleId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('routes')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .order('week_number', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

export async function createSession(params: {
  driverId: string
  vehicleId: string
  trailerId?: string
  coDriverId?: string
  startLat?: number
  startLng?: number
}): Promise<Session> {
  const routeId = await findCurrentRouteId(params.vehicleId)

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      driver_id: params.driverId,
      vehicle_id: params.vehicleId,
      trailer_id: params.trailerId,
      co_driver_id: params.coDriverId,
      start_lat: params.startLat,
      start_lng: params.startLng,
      route_id: routeId,
    })
    .select()
    .single()

  if (error) throw error

  await setVehicleStatus(data.vehicle_id, 'on_route')

  return data
}

export async function endSession(
  sessionId: string,
  params: { endLat?: number; endLng?: number } = {},
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({
      end_time: new Date().toISOString(),
      end_lat: params.endLat,
      end_lng: params.endLng,
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error

  await setVehicleStatus(data.vehicle_id, 'available')

  return data
}

export async function getTasksForSession(sessionId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
  )
}

export async function getTodayTasksForVehicle(vehicleId: string): Promise<Task[]> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('assigned_date', today)

  if (error) throw error
  return sortTasksByPriority(data)
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTaskNotes(taskId: string, notes: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ notes })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createAdHocTask(params: {
  description: string
  sessionId?: string
  driverId?: string
  vehicleId?: string
  assignedDate?: string
  priority?: string
}): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      description: params.description,
      session_id: params.sessionId,
      driver_id: params.driverId,
      vehicle_id: params.vehicleId,
      assigned_date: params.assignedDate ?? new Date().toISOString().slice(0, 10),
      priority: params.priority,
      is_ad_hoc: true,
      status: 'in_progress',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uploadIncidentPhoto(file: File, driverId: string): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${driverId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('incidents').upload(path, file, {
    contentType: file.type,
  })

  if (error) throw error

  const { data } = supabase.storage.from('incidents').getPublicUrl(path)
  return data.publicUrl
}

export async function getChecklistForRoute(routeId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('route_checklist_items')
    .select('*')
    .eq('route_id', routeId)
    .order('item_name', { ascending: true })

  if (error) throw error
  return data
}

export async function updateChecklistItem(
  itemId: string,
  isPacked: boolean,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('route_checklist_items')
    .update({
      is_packed: isPacked,
      packed_at: isPacked ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createIncident(params: {
  description: string
  sessionId?: string
  driverId?: string
  vehicleId?: string
  photoUrl?: string
}): Promise<Incident> {
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      description: params.description,
      session_id: params.sessionId,
      driver_id: params.driverId,
      vehicle_id: params.vehicleId,
      photo_url: params.photoUrl,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
