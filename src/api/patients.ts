import { supabase } from '@/lib/supabase'
import type { Patient, VisitHistoryEntry } from '@/lib/types'

/**
 * PostgREST reads `or(...)` as a comma-separated list, so a comma or bracket in
 * the search text ("Kumar, Ravi") would corrupt the filter and error the query.
 * Double-quoting makes the value literal; only \ and " need escaping inside.
 */
function quoteFilterValue(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export async function listPatients(search?: string): Promise<Patient[]> {
  let query = supabase.from('patients').select('*').order('created_at', { ascending: false })

  const q = search?.trim()
  if (q) {
    // Matches either the name or any part of the phone number.
    const pattern = quoteFilterValue(`%${q}%`)
    query = query.or(`full_name.ilike.${pattern},phone.ilike.${pattern}`)
  }

  const { data, error } = await query.limit(500)
  if (error) throw error
  return data ?? []
}

export async function getPatient(id: string): Promise<Patient> {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createPatient(input: Partial<Patient> & { full_name: string; phone: string }) {
  const { data, error } = await supabase
    .from('patients')
    .insert({ ...input, source: input.source ?? 'walk_in' })
    .select('*')
    .single()
  if (error) throw error
  return data as Patient
}

export async function updatePatient(id: string, patch: Partial<Patient>) {
  const { data, error } = await supabase
    .from('patients')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Patient
}

/**
 * Completed visits for a patient, newest first — powers both the
 * Past Consultations panel in the consult view and the patient profile.
 */
export async function getPatientHistory(
  patientId: string,
  excludeAppointmentId?: string,
): Promise<VisitHistoryEntry[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select(
      `*,
       prescription_items(*),
       appointment:appointments(id, scheduled_at, reason, status)`,
    )
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return (data ?? [])
    .map((row: Record<string, unknown>) => ({
      ...(row as unknown as VisitHistoryEntry),
      appointment: Array.isArray(row.appointment)
        ? (row.appointment[0] ?? null)
        : ((row.appointment as VisitHistoryEntry['appointment']) ?? null),
      prescription_items: ((row.prescription_items as VisitHistoryEntry['prescription_items']) ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((entry) => entry.appointment_id !== excludeAppointmentId)
}

/** Distinct medicine names already prescribed — drives the autocomplete (§3.3). */
export async function listKnownMedicines(): Promise<string[]> {
  const { data, error } = await supabase
    .from('prescription_items')
    .select('medicine_name')
    .order('medicine_name')
    .limit(1000)
  if (error) throw error

  const seen = new Map<string, string>()
  for (const row of data ?? []) {
    const name = (row.medicine_name ?? '').trim()
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
  }
  return [...seen.values()]
}
