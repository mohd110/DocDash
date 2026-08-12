import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True only when both env vars are present. The app renders a setup screen
 * instead of crashing when they are missing, so a fresh clone still boots.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true, // "remember me" is on by default (§3.7)
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)

export const PRESCRIPTION_BUCKET = 'prescriptions'
export const CLINIC_ASSETS_BUCKET = 'clinic-assets'
