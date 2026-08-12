import { supabase } from '@/lib/supabase'
import type {
  ConsultationWithItems,
  DeliveryStatus,
  MedicineDraft,
} from '@/lib/types'

function sortItems(row: Record<string, unknown>): ConsultationWithItems {
  const items = ((row.prescription_items ?? []) as ConsultationWithItems['prescription_items'])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
  return { ...(row as unknown as ConsultationWithItems), prescription_items: items }
}

/**
 * One consultation per appointment. Created lazily the first time the doctor
 * opens the consult screen so a draft always has somewhere to autosave to.
 */
export async function getOrCreateConsultation(
  appointmentId: string,
  patientId: string,
): Promise<ConsultationWithItems> {
  const { data: existing, error } = await supabase
    .from('consultations')
    .select('*, prescription_items(*)')
    .eq('appointment_id', appointmentId)
    .maybeSingle()

  if (error) throw error
  if (existing) return sortItems(existing)

  const { data: created, error: insertError } = await supabase
    .from('consultations')
    .insert({ appointment_id: appointmentId, patient_id: patientId, status: 'draft' })
    .select('*, prescription_items(*)')
    .single()

  if (insertError) {
    // A parallel tab may have won the race — fall back to reading theirs.
    const { data: raced } = await supabase
      .from('consultations')
      .select('*, prescription_items(*)')
      .eq('appointment_id', appointmentId)
      .maybeSingle()
    if (raced) return sortItems(raced)
    throw insertError
  }

  return sortItems(created)
}

export interface ConsultDraft {
  diagnosis: string
  advice: string
  follow_up_date: string | null
  medicines: MedicineDraft[]
}

/** Replaces the medicine rows wholesale — simpler and safer than diffing. */
async function replaceMedicines(consultationId: string, medicines: MedicineDraft[]) {
  const { error: deleteError } = await supabase
    .from('prescription_items')
    .delete()
    .eq('consultation_id', consultationId)
  if (deleteError) throw deleteError

  const rows = medicines
    .filter((m) => m.medicine_name.trim().length > 0)
    .map((m, index) => ({
      consultation_id: consultationId,
      medicine_name: m.medicine_name.trim(),
      dosage: m.dosage.trim() || null,
      frequency: m.frequency.trim() || null,
      duration: m.duration.trim() || null,
      instructions: m.instructions.trim() || null,
      sort_order: index,
    }))

  if (rows.length === 0) return
  const { error } = await supabase.from('prescription_items').insert(rows)
  if (error) throw error
}

export async function saveConsultationDraft(
  consultationId: string,
  draft: ConsultDraft,
): Promise<ConsultationWithItems> {
  const { error } = await supabase
    .from('consultations')
    .update({
      diagnosis: draft.diagnosis.trim() || null,
      advice: draft.advice.trim() || null,
      follow_up_date: draft.follow_up_date || null,
    })
    .eq('id', consultationId)
  if (error) throw error

  await replaceMedicines(consultationId, draft.medicines)

  const { data, error: readError } = await supabase
    .from('consultations')
    .select('*, prescription_items(*)')
    .eq('id', consultationId)
    .single()
  if (readError) throw readError
  return sortItems(data)
}

export async function markConsultationCompleted(
  consultationId: string,
  patch: { prescription_pdf_url?: string | null; whatsapp_delivery_status?: DeliveryStatus },
) {
  const { data, error } = await supabase
    .from('consultations')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...patch,
    })
    .eq('id', consultationId)
    .select('*, prescription_items(*)')
    .single()
  if (error) throw error
  return sortItems(data)
}

export async function setDeliveryStatus(consultationId: string, status: DeliveryStatus) {
  const { error } = await supabase
    .from('consultations')
    .update({ whatsapp_delivery_status: status })
    .eq('id', consultationId)
  if (error) throw error
}

export async function getConsultationById(id: string): Promise<ConsultationWithItems> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*, prescription_items(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return sortItems(data)
}
