// Shared helpers for the n8n-facing Edge Functions (PRD §6).
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

/**
 * Validates the `x-api-key` header against N8N_API_KEY (secret) or, if that is
 * unset, the shared secret the doctor saved in Settings.
 */
export async function requireApiKey(
  request: Request,
  client: SupabaseClient,
): Promise<Response | null> {
  const provided = request.headers.get('x-api-key')
  if (!provided) return json({ error: 'Missing x-api-key header' }, 401)

  const fromEnv = Deno.env.get('N8N_API_KEY')
  let expected = fromEnv ?? null

  if (!expected) {
    const { data } = await client.from('clinic_settings').select('n8n_api_key').eq('id', 1).maybeSingle()
    expected = data?.n8n_api_key ?? null
  }

  if (!expected) {
    return json(
      { error: 'No API key configured. Set the N8N_API_KEY secret or the shared secret in Settings.' },
      500,
    )
  }

  if (provided !== expected) return json({ error: 'Invalid API key' }, 401)
  return null
}

/** Path segments after the function name, e.g. /appointments/<id>/cancel -> [id, 'cancel']. */
export function pathSegments(request: Request, functionName: string): string[] {
  const { pathname } = new URL(request.url)
  const parts = pathname.split('/').filter(Boolean)
  const index = parts.indexOf(functionName)
  return index === -1 ? [] : parts.slice(index + 1)
}

/** Phone numbers arrive in mixed shapes; store one canonical form per patient. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return `+${digits.slice(1).replace(/\D/g, '')}`
  return digits
}
