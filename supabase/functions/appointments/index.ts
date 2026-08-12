// POST /appointments               -> create a booking from the WhatsApp agent
// POST /appointments/:id/cancel    -> patient cancelled via WhatsApp
//
// Both require the header `x-api-key: <shared secret>` (PRD §6).
import {
  corsHeaders,
  json,
  normalizePhone,
  pathSegments,
  requireApiKey,
  serviceClient,
} from '../_shared/utils.ts'

interface BookingPayload {
  booking_id?: string
  patient_name?: string
  phone?: string
  age?: number | null
  gender?: string | null
  scheduled_at?: string
  reason?: string | null
  meeting_link?: string | null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const client = serviceClient()

  const unauthorized = await requireApiKey(request, client)
  if (unauthorized) return unauthorized

  const segments = pathSegments(request, 'appointments')

  /* ------------------------------------------- POST /appointments/:id/cancel */
  if (segments.length === 2 && segments[1] === 'cancel') {
    const appointmentId = segments[0]

    const { data, error } = await client
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)
      .select('id, status')
      .maybeSingle()

    if (error) return json({ error: error.message }, 400)
    if (!data) return json({ error: 'Appointment not found' }, 404)
    return json({ appointment_id: data.id, status: data.status })
  }

  if (segments.length > 0) return json({ error: 'Unknown route' }, 404)

  /* -------------------------------------------------- POST /appointments */
  let payload: BookingPayload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Body must be valid JSON' }, 400)
  }

  const name = payload.patient_name?.trim()
  const phone = payload.phone ? normalizePhone(payload.phone) : ''
  const scheduledAt = payload.scheduled_at?.trim()

  const missing = [
    !name && 'patient_name',
    !phone && 'phone',
    !scheduledAt && 'scheduled_at',
  ].filter(Boolean)

  if (missing.length > 0) {
    return json({ error: `Missing required field(s): ${missing.join(', ')}` }, 400)
  }

  if (Number.isNaN(Date.parse(scheduledAt!))) {
    return json({ error: 'scheduled_at must be an ISO 8601 timestamp' }, 400)
  }

  // Idempotency: the agent may retry a webhook it already delivered.
  if (payload.booking_id) {
    const { data: existing } = await client
      .from('appointments')
      .select('id')
      .eq('n8n_booking_id', payload.booking_id)
      .maybeSingle()

    if (existing) return json({ appointment_id: existing.id, deduplicated: true })
  }

  /* ------------------------------------------- upsert the patient by phone */
  const { data: found } = await client
    .from('patients')
    .select('id, age, gender')
    .eq('phone', phone)
    .maybeSingle()

  let patientId = found?.id ?? null

  if (patientId) {
    // Only fill in blanks — never overwrite details the doctor curated.
    const patch: Record<string, unknown> = {}
    if (found!.age == null && payload.age != null) patch.age = payload.age
    if (!found!.gender && payload.gender) patch.gender = payload.gender
    if (Object.keys(patch).length > 0) {
      await client.from('patients').update(patch).eq('id', patientId)
    }
  } else {
    const { data: created, error: patientError } = await client
      .from('patients')
      .insert({
        full_name: name,
        phone,
        age: payload.age ?? null,
        gender: payload.gender ?? null,
        source: 'whatsapp',
      })
      .select('id')
      .single()

    if (patientError) return json({ error: patientError.message }, 400)
    patientId = created.id
  }

  /* ---------------------------------------------- create the appointment */
  const { data: appointment, error: appointmentError } = await client
    .from('appointments')
    .insert({
      patient_id: patientId,
      scheduled_at: new Date(scheduledAt!).toISOString(),
      reason: payload.reason ?? null,
      meeting_link: payload.meeting_link ?? null,
      n8n_booking_id: payload.booking_id ?? null,
      status: 'booked',
    })
    .select('id')
    .single()

  if (appointmentError) return json({ error: appointmentError.message }, 400)

  return json({ appointment_id: appointment.id, patient_id: patientId }, 201)
})
