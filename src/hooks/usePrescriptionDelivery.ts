import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getClinicSettings } from '@/api/settings'
import { getConsultationById, setDeliveryStatus } from '@/api/consultations'
import { generatePrescription, openPrescriptionPreview } from '@/api/prescriptions'
import { N8nNotConfiguredError, sendPrescriptionToN8n } from '@/api/n8n'
import { buildTextSummary, type PrescriptionData } from '@/lib/prescription-data'
import { supabase } from '@/lib/supabase'
import type { Appointment, ConsultationWithItems, Patient } from '@/lib/types'
import { APPOINTMENT_SCOPED_KEYS } from './queryKeys'

interface DeliverInput {
  patient: Patient
  appointment: Pick<Appointment, 'id' | 'scheduled_at' | 'reason'>
  consultation: ConsultationWithItems
  /** Rebuild the PDF even if one is already stored (used after edits). */
  regenerate?: boolean
}

/**
 * Hands a finished prescription to n8n for WhatsApp delivery and records the
 * outcome so a failure can surface a persistent Retry banner (§3.5, §7.8).
 */
export async function deliverPrescription({
  patient,
  appointment,
  consultation,
  regenerate = false,
}: DeliverInput) {
  const settings = await getClinicSettings()
  const data = { patient, appointment, consultation, settings }

  let pdfUrl = consultation.prescription_pdf_url
  if (regenerate || !pdfUrl) {
    const generated = await generatePrescription(data)
    pdfUrl = generated.pdfUrl
    await supabase
      .from('consultations')
      .update({ prescription_pdf_url: pdfUrl })
      .eq('id', consultation.id)
  }

  const textSummary = buildTextSummary(data)
  await setDeliveryStatus(consultation.id, 'pending')

  try {
    await sendPrescriptionToN8n(settings, {
      patient_phone: patient.phone,
      patient_name: patient.full_name,
      pdf_url: pdfUrl,
      text_summary: textSummary,
      appointment_id: appointment.id,
    })
    await setDeliveryStatus(consultation.id, 'sent')
    return { pdfUrl, delivered: true as const }
  } catch (error) {
    await setDeliveryStatus(consultation.id, 'failed')
    throw error
  }
}

/**
 * Renders a prescription for viewing. Rendering takes a moment, so this goes
 * through a mutation to give the button a spinner and a failure toast rather
 * than appearing to do nothing.
 */
export function useOpenPrescription() {
  return useMutation({
    mutationFn: (data: PrescriptionData) => openPrescriptionPreview(data),
    onError: (error: Error) =>
      toast.error('Could not open the prescription', { description: error.message }),
  })
}

/** Re-send an already-completed prescription (retry banner, patient profile). */
export function useResendPrescription() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({
      patient,
      appointment,
      consultationId,
    }: {
      patient: Patient
      appointment: Pick<Appointment, 'id' | 'scheduled_at' | 'reason'>
      consultationId: string
    }) => {
      const consultation = await getConsultationById(consultationId)
      return deliverPrescription({ patient, appointment, consultation })
    },
    onSuccess: () => {
      for (const key of APPOINTMENT_SCOPED_KEYS) client.invalidateQueries({ queryKey: [key] })
      client.invalidateQueries({ queryKey: ['patient-history'] })
      toast.success('Prescription sent on WhatsApp')
    },
    onError: (error: Error) => {
      for (const key of APPOINTMENT_SCOPED_KEYS) client.invalidateQueries({ queryKey: [key] })
      toast.error('WhatsApp delivery failed', {
        description:
          error instanceof N8nNotConfiguredError
            ? 'Set your n8n webhook URL in Settings, then retry.'
            : error.message,
      })
    },
  })
}
