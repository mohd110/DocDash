# Deploying the Edge Functions without a terminal

Two files here, each a complete Edge Function with the shared helpers inlined —
so they can be pasted straight into the Supabase dashboard, which has no folder
above the function to import `_shared/utils.ts` from.

> **Prefer the CLI if you can.** `npx supabase functions deploy --project-ref <ref>`
> uploads `supabase/functions/` as-is and needs none of this. These copies exist
> for when the CLI account cannot reach the project.

## Steps (do this twice, once per file)

1. Supabase dashboard → **Edge Functions** → **Deploy a new function** → **Via editor**.
2. Name it **exactly** as the file is named, without `.ts`:
   - `appointments`
   - `prescription-delivery-callback`

   The name becomes the URL, and n8n calls those two paths. A typo here is the
   most likely thing to go wrong.
3. Delete the placeholder code in the editor and paste the whole file.
4. **Turn off JWT verification** before deploying — the toggle is next to the
   editor (*Verify JWT with legacy secret*), or under the function's settings
   after it exists.

   This matters. These endpoints authenticate with n8n's `x-api-key` header, not
   a Supabase login token. Leave JWT verification on and every n8n call comes
   back `401` no matter how correct the API key is.
5. Deploy.

## Check it worked

```bash
curl -X POST "https://<ref>.functions.supabase.co/appointments" -H "x-api-key: wrong"
```

- `{"error":"Invalid API key"}` → **working.** The function is live and rejecting
  a bad key, which is exactly its job.
- `404` → the function is not deployed, or the name has a typo.
- `401` with a message about a JWT → step 4 was missed.

No environment variables to set: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are injected into every Edge Function automatically, and there is no shared
secret to configure — each doctor's own `n8n_api_key` identifies their practice.

## Keeping these in step

They are **generated**. Editing them here is a mistake — the CLI deploys the
originals, and the two copies would drift. Change
`supabase/functions/<name>/index.ts` or `supabase/functions/_shared/utils.ts`,
then regenerate:

```bash
node supabase/dashboard-paste/build.mjs
```
