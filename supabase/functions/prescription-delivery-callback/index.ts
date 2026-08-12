// POST /prescription-delivery-callback
// n8n reports whether the WhatsApp send succeeded (PRD §6).
// Body: { appointment_id: string, status: "sent" | "failed" }
import { corsHeaders, json, requireApiKey, serviceClient } from '../_shared/utils.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const client = serviceClient()

  const unauthorized = await requireApiKey(request, client)
  if (unauthorized) return unauthorized

  let payload: { appointment_id?: string; status?: string }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Body must be valid JSON' }, 400)
  }

  const { appointment_id: appointmentId, status } = payload

  if (!appointmentId) return json({ error: 'Missing appointment_id' }, 400)
  if (status !== 'sent' && status !== 'failed') {
    return json({ error: 'status must be "sent" or "failed"' }, 400)
  }

  const { data, error } = await client
    .from('consultations')
    .update({ whatsapp_delivery_status: status })
    .eq('appointment_id', appointmentId)
    .select('id, whatsapp_delivery_status')
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)
  if (!data) return json({ error: 'No consultation found for that appointment' }, 404)

  return json({ consultation_id: data.id, whatsapp_delivery_status: data.whatsapp_delivery_status })
})
