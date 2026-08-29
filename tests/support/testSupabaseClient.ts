import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Untyped on purpose: this helper reaches into tables (`routes`,
// `route_checklist_items`) that aren't part of driver-app's own
// `Database` type (it never needs them at runtime), so typing it against
// that schema would just mean casting everywhere.
export interface TestContext {
  db: SupabaseClient
  driverId: string
  driverEmail: string
}

let cached: Promise<TestContext> | null = null

export function getTestContext(): Promise<TestContext> {
  if (!cached) cached = createTestContext()
  return cached
}

async function createTestContext(): Promise<TestContext> {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const email = process.env.TEST_DRIVER_EMAIL
  const password = process.env.TEST_DRIVER_PASSWORD

  if (!url || !anonKey) {
    throw new Error(
      'Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY - sprawdz plik .env w katalogu driver-app.',
    )
  }

  if (!email || !password) {
    throw new Error(
      'Brak TEST_DRIVER_EMAIL / TEST_DRIVER_PASSWORD - uzupelnij dane testowego konta w pliku .env.test.',
    )
  }

  const db = createClient(url, anonKey)

  const { error: signInError } = await db.auth.signInWithPassword({ email, password })
  if (signInError) {
    throw new Error(
      `Nie udalo sie zalogowac testowym kontem (${email}) w Supabase: ${signInError.message}`,
    )
  }

  const { data: driver, error: driverError } = await db
    .from('drivers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (driverError) throw driverError
  if (!driver) {
    throw new Error(
      `Konto ${email} zalogowalo sie do Supabase Auth, ale nie ma odpowiadajacego rekordu w tabeli "drivers". Dodaj kierowce z tym adresem e-mail.`,
    )
  }

  return { db, driverId: driver.id as string, driverEmail: email }
}
