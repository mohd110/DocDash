import type { DoctorProfile } from '@/lib/types'

/**
 * Outbound calls to the n8n agent (PRD §6). The dashboard never talks to
 * WhatsApp itself — it hands n8n a payload and n8n does the delivery.
 */

function endpoint(doctor: DoctorProfile, path: string) {
  const base = doctor.n8n_webhook_url?.trim().replace(/\/+$/, '')
  if (!base) return null
  return `${base}/${path.replace(/^\/+/, '')}`
}

async function post(url: string, apiKey: string | null, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`n8n responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  return response
}

export interface SendPrescriptionPayload {
  patient_phone: string
  patient_name: string
  pdf_url: string | null
  text_summary: string
  appointment_id: string
}

export class N8nNotConfiguredError extends Error {
  constructor() {
    super('n8n webhook URL is not set. Add it in Settings to deliver prescriptions on WhatsApp.')
    this.name = 'N8nNotConfiguredError'
  }
}

/**
 * Who the message is from. A shared n8n workflow can serve several practices,
 * so every outbound payload names the doctor it belongs to — and the WhatsApp
 * text the patient receives should say the same.
 */
function sender(doctor: DoctorProfile) {
  return {
    doctor_id: doctor.id,
    doctor_name: doctor.full_name,
    clinic_name: doctor.clinic_name,
  }
}

export async function sendPrescriptionToN8n(
  doctor: DoctorProfile,
  payload: SendPrescriptionPayload,
) {
  const url = endpoint(doctor, 'send-prescription')
  if (!url) throw new N8nNotConfiguredError()
  await post(url, doctor.n8n_api_key, { ...sender(doctor), ...payload })
}

export type AppointmentUpdateEvent =
  | 'rescheduled'
  | 'cancelled'
  | 'no_show'
  | 'follow_up_set'

export interface AppointmentUpdatePayload {
  event: AppointmentUpdateEvent
  appointment_id: string
  patient_phone: string
  patient_name: string
  scheduled_at?: string | null
  follow_up_date?: string | null
  note?: string | null
}

/**
 * Fire-and-forget: the agent messaging the patient must never block the
 * doctor's own action from succeeding. Callers surface failures as a toast.
 */
export async function notifyAppointmentUpdated(
  doctor: DoctorProfile,
  payload: AppointmentUpdatePayload,
) {
  const url = endpoint(doctor, 'appointment-updated')
  if (!url) throw new N8nNotConfiguredError()
  await post(url, doctor.n8n_api_key, { ...sender(doctor), ...payload })
}
