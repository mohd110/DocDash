import { formatDate } from './date'
import type { Appointment, ClinicSettings, ConsultationWithItems, Patient } from './types'

/**
 * Everything a prescription needs, in one bundle. Deliberately kept in a
 * PDF-free module so the WhatsApp text path never pulls in the renderer.
 */
export interface PrescriptionData {
  patient: Patient
  appointment: Pick<Appointment, 'id' | 'scheduled_at' | 'reason'>
  consultation: ConsultationWithItems
  settings: ClinicSettings
}

/** A follow-up column is a bare date; read it as IST, never as browser-local. */
function formatDateOnly(date: string) {
  return formatDate(`${date}T00:00:00+05:30`)
}

/** Plain-text version delivered alongside the PDF on WhatsApp (§3.5). */
export function buildTextSummary({
  patient,
  appointment,
  consultation,
  settings,
}: PrescriptionData): string {
  const lines: string[] = []
  const clinicName = settings.clinic_name?.trim() || 'Hakiman Clinic'
  const doctorName = settings.doctor_name?.trim() || 'Dr. Salim'

  lines.push(`*${clinicName}*`)
  lines.push(doctorName + (settings.qualifications ? `, ${settings.qualifications}` : ''))
  if (settings.registration_no) lines.push(`Reg. No. ${settings.registration_no}`)
  lines.push('')
  lines.push(`*Prescription for ${patient.full_name}*`)
  lines.push(`Date: ${formatDate(appointment.scheduled_at)}`)
  if (appointment.reason) lines.push(`Reason: ${appointment.reason}`)

  if (consultation.diagnosis) {
    lines.push('')
    lines.push('*Findings / Diagnosis*')
    lines.push(consultation.diagnosis)
  }

  if (consultation.prescription_items.length > 0) {
    lines.push('')
    lines.push('*Medicines*')
    consultation.prescription_items.forEach((m, i) => {
      const detail = [m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' · ')
      lines.push(`${i + 1}. ${m.medicine_name}${detail ? ` — ${detail}` : ''}`)
    })
  }

  if (consultation.advice) {
    lines.push('')
    lines.push('*Advice*')
    lines.push(consultation.advice)
  }

  if (consultation.follow_up_date) {
    lines.push('')
    lines.push(`*Follow-up:* ${formatDateOnly(consultation.follow_up_date)}`)
  }

  lines.push('')
  lines.push('Get well soon 🌿')

  return lines.join('\n')
}
