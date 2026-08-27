import { supabase } from './supabase'
import type {
  Driver,
  Vehicle,
  Trailer,
  Session,
  Task,
  TaskStatus,
  Incident,
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

export async function getTrailers(): Promise<Trailer[]> {
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function createSession(params: {
  driverId: string
  vehicleId: string
  trailerId?: string
  startLat?: number
  startLng?: number
}): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      driver_id: params.driverId,
      vehicle_id: params.vehicleId,
      trailer_id: params.trailerId,
      start_lat: params.startLat,
      start_lng: params.startLng,
    })
    .select()
    .single()

  if (error) throw error
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

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
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
  notes?: string
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
      notes: params.notes,
      is_ad_hoc: true,
    })
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
