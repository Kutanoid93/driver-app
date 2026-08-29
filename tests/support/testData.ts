import type { SupabaseClient } from '@supabase/supabase-js'

const INCIDENT_PHOTO_BUCKET = 'incidents'

export async function findAnyOtherDriverName(
  db: SupabaseClient,
  excludeDriverId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('drivers')
    .select('full_name')
    .neq('id', excludeDriverId)
    .order('full_name', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data?.full_name as string) ?? null
}

export async function findFirstAvailableVehicle(
  db: SupabaseClient,
): Promise<{ id: string; name: string; plate: string } | null> {
  const { data, error } = await db
    .from('vehicles')
    .select('id, name, plate')
    .eq('status', 'available')
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

// Sessions created through the driver app never get a `route_id` (only
// the admin panel's schedule import links routes to vehicles), so there's
// no way to reach a populated equipment checklist through the UI alone.
// We seed a route + one checklist item for the vehicle the test is about
// to pick, then patch the freshly created session's `route_id` directly -
// simulating "dispatch assigned a route to this vehicle" - and reload so
// the Shift page re-reads it from the database.
export async function seedRouteWithChecklistItem(
  db: SupabaseClient,
  vehicleId: string,
): Promise<{ routeId: string; itemName: string }> {
  const { data: route, error: routeError } = await db
    .from('routes')
    .insert({
      route_number: `E2E-${Date.now()}`,
      team_name: 'E2E Playwright',
      vehicle_id: vehicleId,
    })
    .select('id')
    .single()

  if (routeError) throw routeError

  const itemName = 'E2E test - kaski ochronne'

  const { error: itemError } = await db
    .from('route_checklist_items')
    .insert({ route_id: route.id, item_name: itemName, quantity_needed: 1 })

  if (itemError) throw itemError

  return { routeId: route.id as string, itemName }
}

export async function deleteRoute(db: SupabaseClient, routeId: string): Promise<void> {
  await db.from('route_checklist_items').delete().eq('route_id', routeId)
  await db.from('routes').delete().eq('id', routeId)
}

export async function findActiveSessionId(
  db: SupabaseClient,
  driverId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('sessions')
    .select('id')
    .or(`driver_id.eq.${driverId},co_driver_id.eq.${driverId}`)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data?.id as string) ?? null
}

export async function setSessionRoute(
  db: SupabaseClient,
  sessionId: string,
  routeId: string,
): Promise<void> {
  const { error } = await db.from('sessions').update({ route_id: routeId }).eq('id', sessionId)
  if (error) throw error
}

// Mirrors what the real `endSession` API call does to the vehicle - a
// plain `.delete()` here would leave the vehicle stuck on whatever status
// the test session set it to (e.g. "on_route") if the test failed before
// reaching the app's own "end shift" flow.
export async function deleteSession(db: SupabaseClient, sessionId: string): Promise<void> {
  const { data: session, error: fetchError } = await db
    .from('sessions')
    .select('vehicle_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (fetchError) throw fetchError

  const { error: deleteError } = await db.from('sessions').delete().eq('id', sessionId)
  if (deleteError) throw deleteError

  if (session?.vehicle_id) {
    const { error: statusError } = await db
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', session.vehicle_id as string)
    if (statusError) throw statusError
  }
}

// Safety net for a previous run that crashed mid-test and left an active
// session behind - closes it out and frees the vehicle so this run starts
// from a clean slate instead of failing on "session already active".
export async function forceEndAnyActiveSession(
  db: SupabaseClient,
  driverId: string,
): Promise<void> {
  const { data, error } = await db
    .from('sessions')
    .select('id, vehicle_id')
    .or(`driver_id.eq.${driverId},co_driver_id.eq.${driverId}`)
    .is('end_time', null)

  if (error) throw error
  if (!data || data.length === 0) return

  for (const leftover of data) {
    await db
      .from('sessions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', leftover.id as string)
    await db
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', leftover.vehicle_id as string)
  }
}

export async function findTaskByDescription(
  db: SupabaseClient,
  driverId: string,
  description: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('tasks')
    .select('id')
    .eq('driver_id', driverId)
    .eq('description', description)
    .maybeSingle()

  if (error) throw error
  return (data?.id as string) ?? null
}

export async function deleteTask(db: SupabaseClient, taskId: string): Promise<void> {
  const { error } = await db.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

export async function findIncidentByDescription(
  db: SupabaseClient,
  driverId: string,
  description: string,
): Promise<{ id: string; photoUrl: string | null } | null> {
  const { data, error } = await db
    .from('incidents')
    .select('id, photo_url')
    .eq('driver_id', driverId)
    .eq('description', description)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return { id: data.id as string, photoUrl: (data.photo_url as string) ?? null }
}

export async function deleteIncident(
  db: SupabaseClient,
  incidentId: string,
  photoUrl: string | null,
): Promise<void> {
  if (photoUrl) {
    const marker = `/${INCIDENT_PHOTO_BUCKET}/`
    const markerIndex = photoUrl.indexOf(marker)
    if (markerIndex !== -1) {
      const storagePath = decodeURIComponent(photoUrl.slice(markerIndex + marker.length))
      await db.storage.from(INCIDENT_PHOTO_BUCKET).remove([storagePath])
    }
  }

  const { error } = await db.from('incidents').delete().eq('id', incidentId)
  if (error) throw error
}
