# PRD — DocDash: Doctor Appointment & Patient Dashboard

**Version:** 1.0 | **Date:** Aug 2026 | **Owner:** TaskShift AI
**Scope of this build:** Dashboard (frontend + backend) only. The WhatsApp booking agent is a separate n8n system that talks to this dashboard via API/webhooks. Do NOT build any n8n workflows — only expose the endpoints they will call.

---

## 1. Product Overview

A single-doctor web dashboard used daily. Appointments are booked automatically by a WhatsApp agent (n8n) and appear on the dashboard in real time. The doctor opens the dashboard, sees today's appointments, clicks a patient, reviews their details and history, starts a video consultation (Zoom/Google Meet link), writes findings + prescription in a simple form, and clicks **"Complete & Send"**. The prescription is sent to the patient on WhatsApp (via n8n webhook) and the appointment closes. Doctor moves to the next patient.

**Design philosophy:** One-click everything. Zero training needed. A 60-year-old doctor should be able to use it on day one. Large touch targets, minimal navigation (3 sections max), no nested menus, no jargon.

### Primary user
- **Doctor** (single user for MVP). Logs in once, stays logged in.

### Out of scope (do not build)
- n8n workflows, WhatsApp API integration logic, patient-facing UI, multi-doctor/multi-clinic support, billing/payments, native mobile apps.

---

## 2. Core User Flow (Happy Path)

1. Patient messages clinic on WhatsApp → n8n agent books appointment → n8n calls `POST /api/appointments` with patient details.
2. New appointment appears instantly on the dashboard (Supabase Realtime — no refresh needed). If the patient is new, a patient record is auto-created; if the phone number exists, the appointment links to the existing patient.
3. At appointment time, doctor opens **Appointments** → sees today's list sorted by time, with status badges (Upcoming / In Progress / Completed).
4. Doctor clicks the appointment card → **Consultation View** opens: patient details (left), consult form (right).
5. Doctor clicks **"Start Meeting"** → opens the Zoom/Meet link in a new tab and marks appointment *In Progress*.
6. During/after the call, doctor fills the consult form: **Findings/Diagnosis** (textarea), **Medicines** (repeatable rows: name, dosage, frequency, duration), **Advice/Notes** (textarea), optional **Follow-up date**.
7. Doctor clicks **"Complete & Send to Patient"** → system saves the consultation, generates a clean prescription (text + PDF), calls the n8n outbound webhook to deliver it on WhatsApp, marks appointment *Completed*, and returns doctor to today's list with the next patient highlighted.

**Edge flows:** Mark as **No-show** (one click), **Cancel** (one click + confirm), **Reschedule** (pick new date/time — also notifies n8n via webhook so agent can inform patient).

---

## 3. Feature List

### 3.1 Dashboard (Home)
- Today at a glance: count cards — Today's Appointments, Completed, Upcoming Next, New Patients.
- "Next Appointment" hero card with big **Open Consultation** button.
- Today's appointment timeline list (same data as Appointments section, filtered to today).
- Live updates via Supabase Realtime subscription (new bookings pop in with a subtle highlight animation).

### 3.2 Appointments Section
- Tabs: **Today** (default) / **Upcoming** / **Past**.
- Card per appointment: patient name, age/gender, time, reason for visit (from WhatsApp agent), status badge, one-click actions (Open, No-show, Cancel).
- Search by patient name/phone; date picker for past appointments.
- Statuses: `booked → in_progress → completed | cancelled | no_show`.

### 3.3 Consultation View (the core screen)
- **Left panel — Patient summary:** name, age, gender, phone, reason for visit, allergies/chronic conditions (editable inline), and collapsible **Past Consultations** history (date, diagnosis, prescription — read-only).
- **Right panel — Consult form:**
  - Findings / Diagnosis (textarea, autosaves as draft every few seconds)
  - Medicines: repeatable row → Medicine name (text with autocomplete from previously used medicines), Dosage, Frequency (dropdown: 1-0-1 style presets + custom), Duration, Instructions (e.g., after food)
  - Advice / Notes (textarea)
  - Follow-up date (optional date picker → if set, n8n is notified so agent can remind patient)
- **Top bar buttons:** `Start Meeting` (opens meeting link) · `Complete & Send to Patient` (primary, green) · `Save Draft`.
- Draft autosave: if browser closes mid-consult, nothing is lost.

### 3.4 Patients Section (mini-CRM)
- Searchable table/list of all patients (auto-created from WhatsApp bookings).
- Patient profile page: contact info, demographics, allergies/conditions, full visit history with all past prescriptions, and a **"View Prescription"** action per visit (re-download PDF / re-send via WhatsApp with one click).
- Manual "Add Patient" and "Edit Patient" (simple modal form) for walk-ins.

### 3.5 Prescription Generation & WhatsApp Delivery
- On "Complete & Send": generate a formatted prescription — clinic header (name, doctor name, reg. no., address — configurable in Settings), patient details, date, diagnosis, medicines table, advice, follow-up date, doctor signature image.
- Output: PDF (stored in Supabase Storage) + plain-text summary.
- Dashboard calls **n8n outbound webhook** `POST {N8N_WEBHOOK_URL}/send-prescription` with `{ patient_phone, patient_name, pdf_url, text_summary, appointment_id }`. n8n handles the actual WhatsApp send. Dashboard shows delivery status (Sent / Failed with Retry button) based on webhook response / callback.

### 3.6 Settings
- Clinic profile: clinic name, doctor name, qualifications, registration no., address, logo, signature image.
- Default meeting link mode: **static personal meeting room link** (Zoom PMI or Google Meet personal link — doctor pastes it once) OR per-appointment link supplied by n8n in the booking payload. MVP: static link (simplest, zero API integration).
- Working hours (display only for MVP; slot logic lives in n8n).
- n8n webhook URL + shared secret (API key) configuration.

### 3.7 Auth
- Supabase Auth, email + password, single doctor account. Persistent session ("remember me" default on). No signup page — account seeded manually.

---

## 4. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** | SPA |
| Styling | **Tailwind CSS + shadcn/ui** | Big buttons, clean cards, accessible components |
| State/data | **TanStack Query** + Supabase JS client | Server state caching + realtime |
| Backend/DB | **Supabase** (Postgres, Auth, Realtime, Storage, Edge Functions) | No separate backend server |
| API for n8n | **Supabase Edge Functions** (`/appointments`, `/send-prescription-callback`) secured with API key header | n8n → dashboard ingestion |
| PDF | `@react-pdf/renderer` (client) or Edge Function with `pdf-lib` | Prescription PDF |
| Routing | React Router v6 | 4 routes: `/`, `/appointments`, `/consult/:id`, `/patients`, `/settings` |
| Hosting | Vercel | |
| Video | External links only (Zoom/Meet) — no SDK embed for MVP | Opens in new tab |

---

## 5. Data Model (Postgres / Supabase)

```sql
patients (
  id uuid pk, full_name text, phone text unique not null,
  age int, gender text, allergies text, chronic_conditions text,
  source text default 'whatsapp', created_at timestamptz
)

appointments (
  id uuid pk, patient_id uuid fk -> patients,
  scheduled_at timestamptz not null,
  reason text,                          -- from WhatsApp agent
  status text default 'booked',         -- booked|in_progress|completed|cancelled|no_show
  meeting_link text,                    -- optional per-appointment override
  n8n_booking_id text,                  -- id from the agent for reconciliation
  created_at timestamptz
)

consultations (
  id uuid pk, appointment_id uuid fk unique, patient_id uuid fk,
  diagnosis text, advice text, follow_up_date date,
  status text default 'draft',          -- draft|completed
  prescription_pdf_url text,
  whatsapp_delivery_status text,        -- pending|sent|failed
  created_at timestamptz, completed_at timestamptz
)

prescription_items (
  id uuid pk, consultation_id uuid fk,
  medicine_name text, dosage text, frequency text,
  duration text, instructions text, sort_order int
)

clinic_settings (
  id int pk default 1, clinic_name text, doctor_name text,
  qualifications text, registration_no text, address text,
  logo_url text, signature_url text, default_meeting_link text,
  n8n_webhook_url text, n8n_api_key text
)
```

Row Level Security: all tables readable/writable only by the authenticated doctor. Edge Functions use the service role and validate `x-api-key` header for n8n calls.

---

## 6. API Contract (Dashboard ⇄ n8n)

**Inbound (n8n → dashboard), Edge Function, header `x-api-key: <shared secret>`:**

`POST /appointments` — create booking
```json
{ "booking_id": "n8n-123", "patient_name": "Ravi Kumar", "phone": "+919876543210",
  "age": 34, "gender": "male", "scheduled_at": "2026-08-05T10:30:00+05:30",
  "reason": "fever and cough", "meeting_link": null }
```
→ Upserts patient by phone, creates appointment, returns `{ appointment_id }`.

`POST /appointments/:id/cancel` — patient cancelled via WhatsApp.
`POST /prescription-delivery-callback` — `{ appointment_id, status: "sent"|"failed" }`.

**Outbound (dashboard → n8n):**
`POST {n8n_webhook_url}/send-prescription` — payload in §3.5.
`POST {n8n_webhook_url}/appointment-updated` — fired on reschedule/cancel/no-show from dashboard side + follow-up date set, so the agent can message the patient.

---

## 7. UX Principles & Screen Rules

1. **Max 3 clicks from login to prescription sent** for the happy path (Dashboard → appointment card → Complete & Send).
2. Primary action on every screen is one large, obvious, colored button. Destructive actions need one confirm dialog, nothing else.
3. Sidebar with only 4 items: Dashboard, Appointments, Patients, Settings. Icons + labels, always visible on desktop; bottom nav on mobile.
4. Desktop-first (doctor uses laptop), but fully responsive — consultation form must be usable on a tablet.
5. Status is always visible via color: blue = booked, amber = in progress, green = completed, gray = no-show/cancelled.
6. All timestamps in IST, 12-hour format ("10:30 AM").
7. Empty states with friendly guidance ("No appointments today 🎉").
8. Toasts for every action result; never a silent failure. Failed WhatsApp send shows a persistent Retry banner on the appointment.

---

## 8. Build Phases (for Claude Code)

1. **Phase 1 — Foundation:** Vite + React + TS + Tailwind + shadcn scaffold, Supabase project schema + RLS, Auth + protected routes, app shell/sidebar.
2. **Phase 2 — Appointments core:** Edge Function ingestion API, Appointments list (tabs, realtime), Dashboard home cards.
3. **Phase 3 — Consultation:** Consultation View, consult form with autosave drafts, medicine autocomplete, status transitions.
4. **Phase 4 — Prescription & delivery:** PDF generation, Supabase Storage, outbound n8n webhook, delivery status + retry.
5. **Phase 5 — Patients CRM + Settings:** patient list/profile/history, resend prescription, clinic settings, polish + empty states + mobile responsiveness.

**Acceptance test (must pass):** Simulate an n8n booking via curl → appointment appears live on dashboard → open it → fill form → Complete & Send → PDF generated, webhook fired, appointment closed, visit visible in patient history.
