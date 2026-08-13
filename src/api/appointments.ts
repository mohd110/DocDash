import { supabase } from '@/lib/supabase'
import { endOfTodayIST, istDayRange, startOfTodayIST } from '@/lib/date'
import type { AppointmentStatus, AppointmentWithPatient } from '@/lib/types'

/**
 * PostgREST returns embedded one-to-one rows as either an object or a
 * single-element array depending on how it infers the relationship.
 * Normalise once here so callers never have to care.
 */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const SELECT = `
  *,
  patient:patients(*),
  consultation:consultations(id, status, whatsapp_delivery_status, prescription_pdf_url)
`

type RawRow = Record<string, unknown>

function normalize(row: RawRow): AppointmentWithPatient {
  return {
    ...(row as unknown as AppointmentWithPatient),
    patient: one(row.patient as never),
    consultation: one(row.consultation as never),
  }
}

export type AppointmentScope = 'today' | 'upcoming' | 'past'

/** Bounded window for the Past tab when the doctor has not picked a date. */
const PAST_LOOKBACK_DAYS = 60

export async function listAppointments(
  scope: AppointmentScope,
  day?: string,
): Promise<AppointmentWithPatient[]> {
  let query = supabase.from('appointments').select(SELECT)

  if (day) {
    // An explicit date always wins, whichever tab asked for it.
    const { start, end } = istDayRange(day)
    query = query.gte('scheduled_at', start).lt('scheduled_at', end).order('scheduled_at')
  } else if (scope === 'today') {
    query = query
      .gte('scheduled_at', startOfTodayIST())
      .lt('scheduled_at', endOfTodayIST())
      .order('scheduled_at')
  } else if (scope === 'upcoming') {
    query = query.gte('scheduled_at', endOfTodayIST()).order('scheduled_at').limit(200)
  } else {
    const from = new Date(Date.parse(startOfTodayIST()) - PAST_LOOKBACK_DAYS * 86_400_000)
    query = query
      .gte('scheduled_at', from.toISOString())
      .lt('scheduled_at', startOfTodayIST())
      .order('scheduled_at', { ascending: false })
      .limit(200)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(normalize)
}

/**
 * Every appointment between two IST calendar days, inclusive — one query per
 * month for the calendar view rather than one per visible day.
 */
export async function listAppointmentsBetween(
  fromDay: string,
  toDay: string,
): Promise<AppointmentWithPatient[]> {
  const { start } = istDayRange(fromDay)
  const { end } = istDayRange(toDay)

  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at')
    .limit(1000)

  if (error) throw error
  return (data ?? []).map(normalize)
}

export async function getAppointment(id: string): Promise<AppointmentWithPatient> {
  const { data, error } = await supabase.from('appointments').select(SELECT).eq('id', id).single()
  if (error) throw error
  return normalize(data)
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return normalize(data)
}

export async function rescheduleAppointment(id: string, scheduledAt: string) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ scheduled_at: scheduledAt, status: 'booked' })
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return normalize(data)
}

/**
 * An appointment for this patient that is still open today, if there is one.
 * "Add Prescription" reuses it rather than stacking a second appointment on top
 * of the one the patient is literally sitting in.
 */
export async function findOpenAppointmentToday(
  patientId: string,
): Promise<AppointmentWithPatient | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .eq('patient_id', patientId)
    .in('status', ['booked', 'in_progress'])
    .gte('scheduled_at', startOfTodayIST())
    .lt('scheduled_at', endOfTodayIST())
    .order('scheduled_at')
    .limit(1)

  if (error) throw error
  return data?.[0] ? normalize(data[0]) : null
}

/** Walk-in booked at the desk rather than through the WhatsApp agent. */
export async function createAppointment(input: {
  patient_id: string
  scheduled_at: string
  reason?: string | null
  meeting_link?: string | null
}) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...input, status: 'booked' })
    .select(SELECT)
    .single()
  if (error) throw error
  return normalize(data)
}

/** Counts for the Dashboard "today at a glance" cards (§3.1). */
export async function getTodayStats() {
  const todays = await listAppointments('today')
  const newPatients = todays.filter(
    (a) => a.patient && Date.parse(a.patient.created_at) >= Date.parse(startOfTodayIST()),
  )
  const uniqueNew = new Set(newPatients.map((a) => a.patient_id))

  return {
    total: todays.length,
    completed: todays.filter((a) => a.status === 'completed').length,
    upcoming: todays.filter((a) => a.status === 'booked').length,
    inProgress: todays.filter((a) => a.status === 'in_progress').length,
    newPatients: uniqueNew.size,
    appointments: todays,
  }
}
