export type AppointmentStatus =
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type ConsultationStatus = 'draft' | 'completed'

export type DeliveryStatus = 'pending' | 'sent' | 'failed'

export interface Patient {
  id: string
  doctor_id: string
  full_name: string
  phone: string
  age: number | null
  gender: string | null
  allergies: string | null
  chronic_conditions: string | null
  source: string | null
  created_at: string
}

export interface Appointment {
  id: string
  doctor_id: string
  patient_id: string
  scheduled_at: string
  reason: string | null
  status: AppointmentStatus
  meeting_link: string | null
  n8n_booking_id: string | null
  created_at: string
}

/**
 * Appointment joined with its patient — the shape every list screen consumes.
 * `patient` is nullable only defensively: the FK is NOT NULL, but a failed
 * embed should render a placeholder rather than crash the list.
 */
export interface AppointmentWithPatient extends Appointment {
  patient: Patient | null
  consultation?: Pick<
    Consultation,
    'id' | 'status' | 'whatsapp_delivery_status' | 'prescription_pdf_url'
  > | null
}

export interface Consultation {
  id: string
  doctor_id: string
  appointment_id: string
  patient_id: string
  diagnosis: string | null
  advice: string | null
  follow_up_date: string | null
  status: ConsultationStatus
  prescription_pdf_url: string | null
  whatsapp_delivery_status: DeliveryStatus | null
  created_at: string
  completed_at: string | null
}

export interface PrescriptionItem {
  id: string
  doctor_id: string
  consultation_id: string
  medicine_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string | null
  sort_order: number
}

/** A medicine row while it is being edited — no id until saved. */
export interface MedicineDraft {
  key: string
  medicine_name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

/**
 * A tenant. One row per doctor, keyed by their auth user id — it holds both the
 * professional identity asked for at sign-up and the clinic/integration config
 * that used to live in the single-tenant `clinic_settings` row.
 */
export interface DoctorProfile {
  id: string
  email: string | null
  full_name: string
  qualifications: string | null
  specialization: string | null
  registration_no: string | null
  years_experience: number | null
  phone: string | null
  clinic_name: string | null
  address: string | null
  logo_url: string | null
  signature_url: string | null
  default_meeting_link: string | null
  working_hours: string | null
  /** #RRGGBB. Null falls back to the default palette — see src/lib/theme.ts. */
  theme_primary: string | null
  theme_background: string | null
  n8n_webhook_url: string | null
  n8n_api_key: string | null
  created_at: string
}

/** The professional questions answered on the sign-up form. */
export interface DoctorSignupDetails {
  full_name: string
  qualifications: string
  specialization: string
  registration_no: string
  years_experience: string
  phone: string
  clinic_name: string
  address: string
  working_hours: string
}

export interface ConsultationWithItems extends Consultation {
  prescription_items: PrescriptionItem[]
}

/** One row of a patient's visit history. */
export interface VisitHistoryEntry extends ConsultationWithItems {
  appointment: Pick<Appointment, 'id' | 'scheduled_at' | 'reason' | 'status'> | null
}
