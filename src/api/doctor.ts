import { CLINIC_ASSETS_BUCKET, supabase } from '@/lib/supabase'
import type { DoctorProfile } from '@/lib/types'

/**
 * The signed-in doctor's own tenant row. RLS already restricts `doctors` to
 * `id = auth.uid()`, so no filter is needed — but one is passed anyway so a
 * misconfigured policy can never quietly hand back somebody else's profile.
 */
export async function getDoctorProfile(): Promise<DoctorProfile | null> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function saveDoctorProfile(patch: Partial<DoctorProfile>): Promise<DoctorProfile> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('You are signed out. Sign in again to save your profile.')

  // Upsert rather than update: an account created before the signup trigger
  // existed has no row yet, and the onboarding screen writes the first one.
  const { data, error } = await supabase
    .from('doctors')
    .upsert({ ...patch, id: userId, email: patch.email ?? auth.user?.email ?? null })
    .select('*')
    .single()

  if (error) throw error
  return data
}

/**
 * Uploads the clinic logo / doctor signature and returns a public URL.
 * Everything is written under `<doctor_id>/` — the storage policy only permits
 * writes inside your own folder.
 */
export async function uploadDoctorAsset(kind: 'logo' | 'signature', file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('You are signed out. Sign in again to upload.')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/${kind}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(CLINIC_ASSETS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error

  const { data } = supabase.storage.from(CLINIC_ASSETS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** A profile is usable once the doctor has told us who they are. */
export function isProfileComplete(profile: DoctorProfile | null | undefined): boolean {
  return Boolean(profile && profile.full_name.trim().length > 0)
}

/**
 * Same as getDoctorProfile but for paths that cannot proceed without one —
 * building a prescription, or calling n8n with this doctor's credentials.
 */
export async function requireDoctorProfile(): Promise<DoctorProfile> {
  const profile = await getDoctorProfile()
  if (!profile) {
    throw new Error('Your doctor profile is missing. Complete it in Settings and try again.')
  }
  return profile
}
