// Reczne odzwierciedlenie schematu SQL (patrz zrodlo migracji).
// Struktura zgodna z formatem generowanym przez `supabase gen types typescript`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Wartosci konwencjonalne uzywane przez aplikacje - kolumny w bazie
// to zwykly `text` bez ograniczenia CHECK, wiec DB przyjmie dowolny string.
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'cancelled'
export type IncidentStatus = 'reported' | 'in_review' | 'resolved'

export interface Database {
  public: {
    Tables: {
      drivers: {
        Row: {
          id: string
          full_name: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          name: string
          plate: string
          vehicle_type: string
          capacity_tons: number | null
          qr_code: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          plate: string
          vehicle_type: string
          capacity_tons?: number | null
          qr_code: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          plate?: string
          vehicle_type?: string
          capacity_tons?: number | null
          qr_code?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      trailers: {
        Row: {
          id: string
          name: string
          plate: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          plate?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          plate?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          driver_id: string
          vehicle_id: string
          trailer_id: string | null
          start_time: string
          start_lat: number | null
          start_lng: number | null
          end_time: string | null
          end_lat: number | null
          end_lng: number | null
          created_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          vehicle_id: string
          trailer_id?: string | null
          start_time?: string
          start_lat?: number | null
          start_lng?: number | null
          end_time?: string | null
          end_lat?: number | null
          end_lng?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          vehicle_id?: string
          trailer_id?: string | null
          start_time?: string
          start_lat?: number | null
          start_lng?: number | null
          end_time?: string | null
          end_lat?: number | null
          end_lng?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_driver_id_fkey'
            columns: ['driver_id']
            referencedRelation: 'drivers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_vehicle_id_fkey'
            columns: ['vehicle_id']
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_trailer_id_fkey'
            columns: ['trailer_id']
            referencedRelation: 'trailers'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          session_id: string | null
          driver_id: string | null
          vehicle_id: string | null
          assigned_date: string
          description: string
          priority: string
          status: string
          is_ad_hoc: boolean
          notes: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          assigned_date: string
          description: string
          priority?: string
          status?: string
          is_ad_hoc?: boolean
          notes?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          assigned_date?: string
          description?: string
          priority?: string
          status?: string
          is_ad_hoc?: boolean
          notes?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_driver_id_fkey'
            columns: ['driver_id']
            referencedRelation: 'drivers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_vehicle_id_fkey'
            columns: ['vehicle_id']
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
      incidents: {
        Row: {
          id: string
          session_id: string | null
          driver_id: string | null
          vehicle_id: string | null
          description: string
          photo_url: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          description: string
          photo_url?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          description?: string
          photo_url?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'incidents_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'incidents_driver_id_fkey'
            columns: ['driver_id']
            referencedRelation: 'drivers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'incidents_vehicle_id_fkey'
            columns: ['vehicle_id']
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Driver = Database['public']['Tables']['drivers']['Row']
export type DriverInsert = Database['public']['Tables']['drivers']['Insert']

export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']

export type Trailer = Database['public']['Tables']['trailers']['Row']
export type TrailerInsert = Database['public']['Tables']['trailers']['Insert']

export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type SessionUpdate = Database['public']['Tables']['sessions']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Incident = Database['public']['Tables']['incidents']['Row']
export type IncidentInsert = Database['public']['Tables']['incidents']['Insert']
