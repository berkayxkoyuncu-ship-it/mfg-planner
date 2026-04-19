import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Line = {
  id: string
  name: string
  type: 'internal' | 'external'
  is_active: boolean
  sort_order: number
  created_at: string
}

export type Brand = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type Order = {
  id: string
  brand: string
  style: string
  quantity: number
  daily_capacity: number
  days_needed: number
  target_ship_date: string | null
  line_id: string | null
  start_date: string | null
  end_date: string | null
  status: 'planned' | 'in_progress' | 'completed'
  color: string
  ana_marka: string | null
  created_at: string
}

export type DailyActual = {
  id: string
  order_id: string
  line_id: string
  date: string
  actual_qty: number
  created_at: string
}

export type Holiday = {
  id: string
  date: string        // yyyy-MM-dd
  name: string
  created_at: string
}
