import { CLINIC_ASSETS_BUCKET, supabase } from '@/lib/supabase'
import type { ClinicSettings } from '@/lib/types'

const EMPTY: ClinicSettings = {
  id: 1,
  clinic_name: 'Hakiman Clinic',
  doctor_name: 'Dr. Salim',
  qualifications: null,
  registration_no: null,
  address: null,
  logo_url: null,
  signature_url: null,
  default_meeting_link: null,
  working_hours: null,
  n8n_webhook_url: null,
  n8n_api_key: null,
}

/** Singleton row (id = 1). Returns sensible blanks if it has not been seeded. */
export async function getClinicSettings(): Promise<ClinicSettings> {
  const { data, error } = await supabase.from('clinic_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data ?? EMPTY
}

export async function saveClinicSettings(patch: Partial<ClinicSettings>): Promise<ClinicSettings> {
  const { data, error } = await supabase
    .from('clinic_settings')
    .upsert({ ...patch, id: 1 })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Uploads the clinic logo / doctor signature and returns a public URL. */
export async function uploadClinicAsset(kind: 'logo' | 'signature', file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${kind}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(CLINIC_ASSETS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error

  const { data } = supabase.storage.from(CLINIC_ASSETS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
