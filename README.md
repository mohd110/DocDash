# DocDash

Multi-tenant doctor appointment & patient dashboard. Built to the spec in
[`DocDash-PRD.md`](./DocDash-PRD.md), extended to serve many practices from one deployment.

Every doctor signs up with their own credentials and gets their own tenant: their patients,
appointments, consultations and prescriptions are visible to nobody else. Tenancy is enforced in
Postgres by row-level security keyed on `auth.uid()`, not in the client — see
[Multi-tenancy](#multi-tenancy).

Appointments are booked by a WhatsApp agent (n8n) and land here in real time. The doctor opens
today's list, clicks a patient, starts the video call, writes findings + prescription, and clicks
**Complete & Send to Patient** — the prescription goes out on WhatsApp as a PDF and the appointment
closes.

> The n8n workflows are **not** part of this repo. This dashboard only exposes the endpoints n8n
> calls, and calls n8n's webhooks back.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS, shadcn/ui-style components (cream + bottle green) |
| Server state | TanStack Query + Supabase JS |
| Backend | Supabase — Postgres, Auth, Realtime, Storage, Edge Functions |
| PDF | `@react-pdf/renderer` (lazy-loaded on first use) |
| Routing | React Router v6 |
| Hosting | Vercel |

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env      # then fill in the two values
```

`.env`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

### 2. Database

Paste [`supabase/schema.sql`](./supabase/schema.sql) into the Supabase SQL editor and run it. It is
idempotent. It creates the `doctors` tenant table, the four data tables, tenant-scoped row-level
security, the signup trigger, the Realtime publication, and the `prescriptions` / `clinic-assets`
storage buckets.

**Upgrading a database that already holds single-tenant data?** Run
[`supabase/migrations/001_single_to_multi_tenant.sql`](./supabase/migrations/001_single_to_multi_tenant.sql)
**first** (edit the email constant at the top so it matches the existing doctor's login), then run
`schema.sql`. The migration folds `clinic_settings` into a `doctors` row and stamps every existing
row with that doctor's id. Files already in storage keep their current paths and URLs; only new
uploads go under `<doctor_id>/`.

### 3. Doctor accounts

Doctors create their own. **Sign up** asks for email + password, then name, degrees,
specialization, registration number, years of experience, contact number, clinic name, working
hours and address; a Postgres trigger turns those answers into the doctor's profile row.

If your project has *Confirm email* switched on (Supabase → Authentication → Providers → Email),
the doctor must click the emailed link before their first sign-in. Switch it off for a quicker
demo.

### 4. Edge Functions

```bash
npm i -g supabase
supabase link --project-ref <project-ref>
supabase functions deploy appointments
supabase functions deploy prescription-delivery-callback
```

No shared secret to configure: each doctor is issued their own `n8n_api_key` on sign-up, and the
key a request arrives with is what tells the function whose practice the booking belongs to.

**No terminal, or the CLI account cannot reach the project?**
[`supabase/dashboard-paste/`](./supabase/dashboard-paste/) holds single-file builds of both
functions, ready to paste into the dashboard editor, with instructions.

### 5. Run

```bash
npm run dev      # http://localhost:5173
npm run build    # production build
npm run lint     # typecheck only
```

### 6. Settings screen

Sign in and finish **Settings** — the sign-up answers are already there; add your logo, signature,
Zoom/Meet personal room link and n8n webhook URL. Your API key is shown here (read-only, with a
copy button) for pasting into your n8n workflow. The clinic header and signature are baked into
every prescription PDF you issue.

---

## Theming

Each doctor picks two colours in **Settings → Colours** — a brand colour (ink) and a background
colour (paper) — stored on their row as `theme_primary` / `theme_background`. Null means the
default cream + bottle green.

Everything else is generated. `src/lib/theme.ts` holds the *shape* of the original palette (its
lightness rhythm, saturation falloff and slight hue drift, measured off the cream + bottle green
scales) and re-anchors it on the chosen colours, producing a full `brand-50…900` and
`surface-50…500` ramp plus every semantic token. Those are published as CSS custom properties, and
the Tailwind `brand-*` / `surface-*` classes resolve to them — so a new colour re-themes the whole
app without a single class changing. The prescription PDF has no CSS variables to resolve, so
`buildPrintPalette()` bakes the same colours in as hex at render time.

Two constraints are enforced, because the colours have jobs: the background is lightened if it is
too dark (every text colour in the app is dark), and the brand colour is deepened if it is too pale
(it carries white text on buttons). Hue and saturation are always the doctor's; only lightness is
negotiated, and the picker says so when it happens.

> Adding a new colour to the UI? Use `brand-*` / `surface-*` or a semantic token
> (`bg-card`, `text-muted-foreground`). A raw hex or a stock Tailwind colour will not follow the
> doctor's theme.

---

## Multi-tenancy

| Concern | How it is handled |
|---|---|
| Tenant identity | One row in `public.doctors`, whose `id` **is** the `auth.users` id |
| Data isolation | `doctor_id` on every table + RLS `using (doctor_id = auth.uid())` |
| Writes | `doctor_id` defaults to `auth.uid()`, so the client never sets it and cannot forge it |
| Profile creation | An `on_auth_user_created` trigger reads the sign-up answers from user metadata |
| Files | Objects are written under `<doctor_id>/…`; the storage policy allows writes only in your own folder |
| Realtime | Subscriptions are filtered `doctor_id=eq.<you>`, so another practice's booking never reaches your browser |
| Cache | The TanStack Query cache is cleared on sign-in and sign-out — a shared computer never serves the previous doctor's patients |
| Edge Functions | Run as the service role (RLS off), so they resolve the tenant from `x-api-key` and filter every query by it explicitly |
| Phone uniqueness | `unique (doctor_id, phone)` — the same person can be a patient of two different doctors |
| Look | Each doctor picks their own brand + background colour — see [Theming](#theming) |

The one thing that reaches outside a tenant is a prescription PDF URL: the `prescriptions` bucket
is publicly readable, because the WhatsApp agent forwards that link to the patient. The paths are
unguessable UUIDs. If that trade is wrong for you, make the bucket private and switch
`uploadPrescriptionPdf` to signed URLs.

---

## Deploying to Vercel

Push the repo, then **Vercel → Add New Project → Import**. `vercel.json` already sets the framework,
build command and output directory, so nothing needs configuring by hand.

### Environment variables (required)

**Project → Settings → Environment Variables** — add both for *Production*, *Preview* and
*Development*:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |

> `VITE_*` variables are baked into the bundle **at build time**, not read at runtime. If you change
> one, you must redeploy — editing it alone changes nothing on the live site. If they are missing,
> the deployed app shows the setup screen instead of the dashboard.

### What `vercel.json` does

- **SPA rewrite** — every path falls back to `index.html`. Without it, a hard refresh on
  `/appointments` or `/consult/:id` returns 404, because those routes exist only in React Router.
  Vercel checks the filesystem first, so `/assets/*` and `/logo.svg` still serve as real files.
- **Caching** — hashed files under `/assets/` are immutable for a year; `index.html` must
  revalidate, so a new deploy is picked up right away instead of serving stale HTML that points at
  deleted asset hashes.
- **Security headers** — `nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, and a
  `Permissions-Policy` that denies camera/microphone/geolocation. That last one is safe here because
  video consults open Zoom/Meet in a new tab on their own origin — this app never uses the camera
  itself.

### After the first deploy

1. **n8n CORS.** The dashboard calls your n8n webhooks *from the browser*, so n8n must allow your
   Vercel origin (`https://<project>.vercel.app`). If it does not, Complete & Send will save the
   consultation and generate the PDF but report the WhatsApp delivery as failed, with a Retry
   button. This is the most common post-deploy surprise.
2. **Edge Functions are deployed separately** — they live on Supabase, not Vercel. See step 4 above.
3. Sign in and fill in **Settings** before the first real consultation, so the prescription PDF
   carries your clinic header and signature.

---

## API contract with n8n

> **Building the n8n side?** [`docs/N8N-INTEGRATION.md`](./docs/N8N-INTEGRATION.md) is a
> self-contained handoff for the agent developer — payloads, curl examples, error codes,
> CORS requirements and a testing checklist. Send them that file; they don't need this one.

### Inbound — n8n calls the dashboard

Base URL: `https://<project-ref>.functions.supabase.co`
Every request needs `x-api-key: <that doctor's key>` — copy it from their Settings screen. The key
identifies the practice, so a booking is filed against the doctor who owns the key, and a request
can never read or change another practice's rows.

#### `POST /appointments`

```json
{
  "booking_id": "n8n-123",
  "patient_name": "Ravi Kumar",
  "phone": "+919876543210",
  "age": 34,
  "gender": "male",
  "scheduled_at": "2026-08-05T10:30:00+05:30",
  "reason": "fever and cough",
  "meeting_link": null
}
```

Upserts the patient by phone **within that doctor's practice**, creates the appointment, returns
`{ "appointment_id": "...", "patient_id": "...", "doctor_id": "..." }`.

Re-sending the same `booking_id` returns the original appointment with
`"deduplicated": true` instead of creating a second one.

#### `POST /appointments/:id/cancel`

Patient cancelled over WhatsApp → sets the appointment to `cancelled`.

#### `POST /prescription-delivery-callback`

```json
{ "appointment_id": "...", "status": "sent" }
```

`status` is `sent` or `failed`. A `failed` status raises the persistent Retry banner on the
appointment card.

### Outbound — the dashboard calls n8n

Base URL is whatever that doctor saved in Settings; their own `x-api-key` is sent.

#### `POST {n8n_webhook_url}/send-prescription`

```json
{
  "doctor_id": "...",
  "doctor_name": "Dr. Asha Rao",
  "clinic_name": "Sunrise Clinic",
  "patient_phone": "+919876543210",
  "patient_name": "Ravi Kumar",
  "pdf_url": "https://.../prescription-1234.pdf",
  "text_summary": "*Sunrise Clinic* …",
  "appointment_id": "..."
}
```

`doctor_id` / `doctor_name` / `clinic_name` are on **both** outbound payloads, so one shared n8n
workflow can serve several practices and sign each WhatsApp message correctly.

#### `POST {n8n_webhook_url}/appointment-updated`

Fired on reschedule, cancel, no-show, and when a follow-up date is set.

```json
{
  "doctor_id": "...",
  "doctor_name": "Dr. Asha Rao",
  "clinic_name": "Sunrise Clinic",
  "event": "rescheduled",
  "appointment_id": "...",
  "patient_phone": "+919876543210",
  "patient_name": "Ravi Kumar",
  "scheduled_at": "2026-08-06T11:00:00+05:30",
  "follow_up_date": null
}
```

`event` is one of `rescheduled` · `cancelled` · `no_show` · `follow_up_set`.

---

## Acceptance test

Simulate an n8n booking and walk the happy path:

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/appointments" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <the doctor key from Settings>" \
  -d '{
    "booking_id": "test-001",
    "patient_name": "Ravi Kumar",
    "phone": "+919876543210",
    "age": 34,
    "gender": "male",
    "scheduled_at": "2026-08-07T10:30:00+05:30",
    "reason": "fever and cough"
  }'
```

Expected: the appointment appears on the open dashboard within a second (no refresh) with a brief
highlight. Open it → fill findings + a medicine row → **Complete & Send to Patient** → the PDF is
generated and stored, the `send-prescription` webhook fires, the appointment moves to *Completed*,
and the visit shows up under the patient's history with **View Prescription** and
**Re-send on WhatsApp**.

---

## Project structure

```
src/
  api/          Supabase queries, n8n webhook calls, PDF generation + upload
  components/
    ui/         Buttons, cards, inputs, dialog, tabs, badges, empty states
    layout/     Sidebar, mobile bottom nav, logo
    appointments/  Appointment card, status badge, reschedule dialog
    consult/    Patient summary, medicine rows, past consultations
    patients/   Add/edit patient, book appointment
    dashboard/  Stat cards
  hooks/        TanStack Query hooks, auth, realtime, delivery
  lib/          Supabase client, types, IST date helpers, theme engine, prescription PDF + text
  pages/        Login, Signup, Onboarding, Dashboard, Appointments, Consult, Patients, Profile, Settings
supabase/
  schema.sql    Tables, tenant RLS, signup trigger, realtime, storage buckets
  migrations/   One-time single-tenant -> multi-tenant upgrade
  functions/    Edge Functions n8n calls
```

## Notes

- **Timezone**: every timestamp is rendered in IST, 12-hour format, regardless of the browser's own
  timezone. Day boundaries (today / upcoming / past) are IST midnights.
- **Drafts**: the consult form autosaves ~1.8s after you stop typing, so closing the browser
  mid-consult loses nothing.
- **Delivery failures never block the doctor.** If the WhatsApp handoff fails, the consultation
  still closes and the appointment card shows a persistent Retry button.
- **Onboarding fallback**: a signed-in account with no profile row (an invite created straight in
  Supabase, say) is asked the same questions the sign-up form asks before the dashboard opens.
