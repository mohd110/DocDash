# Hakiman

Doctor appointment & patient dashboard. Built to the spec in [`DocDash-PRD.md`](./DocDash-PRD.md).

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
idempotent. It creates the five tables, row-level security, the Realtime publication, and the
`prescriptions` / `clinic-assets` storage buckets.

### 3. The doctor's account

There is no signup page (single-user MVP). Create the account manually:

**Supabase → Authentication → Users → Add user** — set an email + password and tick
*Auto Confirm User*.

### 4. Edge Functions

```bash
npm i -g supabase
supabase link --project-ref <project-ref>
supabase functions deploy appointments
supabase functions deploy prescription-delivery-callback
supabase secrets set N8N_API_KEY=<a-long-random-string>
```

`N8N_API_KEY` is optional — if it is unset, the functions fall back to the shared secret saved on
the Settings screen.

### 5. Run

```bash
npm run dev      # http://localhost:5173
npm run build    # production build
npm run lint     # typecheck only
```

### 6. Settings screen

Sign in and fill in **Settings** — clinic name, doctor name, qualifications, registration number,
address, logo, signature, your Zoom/Meet personal room link, and the n8n webhook URL + shared
secret. The clinic header and signature are baked into every prescription PDF.

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
Every request needs `x-api-key: <shared secret>`.

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

Upserts the patient by phone, creates the appointment, returns
`{ "appointment_id": "...", "patient_id": "..." }`.

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

Base URL is whatever you saved in Settings; the same `x-api-key` is sent.

#### `POST {n8n_webhook_url}/send-prescription`

```json
{
  "patient_phone": "+919876543210",
  "patient_name": "Ravi Kumar",
  "pdf_url": "https://.../prescription-1234.pdf",
  "text_summary": "*Hakiman Clinic* …",
  "appointment_id": "..."
}
```

#### `POST {n8n_webhook_url}/appointment-updated`

Fired on reschedule, cancel, no-show, and when a follow-up date is set.

```json
{
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
  -H "x-api-key: <shared secret>" \
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
  lib/          Supabase client, types, IST date helpers, prescription PDF + text
  pages/        Login, Dashboard, Appointments, Consult, Patients, Profile, Settings
supabase/
  schema.sql    Tables, RLS, realtime, storage buckets
  functions/    Edge Functions n8n calls
```

## Notes

- **Timezone**: every timestamp is rendered in IST, 12-hour format, regardless of the browser's own
  timezone. Day boundaries (today / upcoming / past) are IST midnights.
- **Drafts**: the consult form autosaves ~1.8s after you stop typing, so closing the browser
  mid-consult loses nothing.
- **Delivery failures never block the doctor.** If the WhatsApp handoff fails, the consultation
  still closes and the appointment card shows a persistent Retry button.
