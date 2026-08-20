# DocDash ⇄ n8n — Integration Handoff

**For:** whoever is building the WhatsApp booking agent in n8n
**Repo:** https://github.com/mohd110/DocDash
**Dashboard:** React SPA on Vercel · **Backend:** Supabase (Postgres + Edge Functions)

You do **not** need to read the dashboard code. Everything you need is in this file.

---

## 1. How the two halves fit together

```
   Patient (WhatsApp)
          │
          ▼
   ┌──────────────┐   1. books appointment    ┌─────────────────────┐
   │              │ ────────────────────────► │                     │
   │  n8n agent   │                           │  DocDash dashboard  │
   │              │ ◄──────────────────────── │  (doctor's screen)  │
   └──────────────┘   2. sends prescription   └─────────────────────┘
          │              + appointment changes
          ▼
   Patient (WhatsApp)
```

**You call us** for anything the patient does on WhatsApp (book, cancel).
**We call you** for anything the doctor does on the dashboard (prescription ready,
rescheduled, cancelled, no-show, follow-up set). You do the actual WhatsApp sending —
the dashboard never touches the WhatsApp API.

So there are two jobs:

| Job | Who builds it |
|---|---|
| **A.** Call our 3 endpoints | You |
| **B.** Expose 2 webhooks for us to call | You |

---

## 2. Authentication and which doctor a request belongs to

The dashboard is **multi-tenant**: one deployment serves many doctors, and each one only ever
sees their own patients. So the API key is not a single shared secret — **every doctor has their
own**, and the key *is* how we know whose practice a message concerns.

```
x-api-key: <that doctor's key>
```

- **Inbound (you → us):** we look the key up, and file the booking against the doctor who owns
  it. An unknown key is `401`. A valid key can only read and change that doctor's own rows —
  passing another practice's `appointment_id` returns `404`, not their data.
- **Outbound (us → you):** we send that doctor's own key, plus `doctor_id`, `doctor_name` and
  `clinic_name` in the body, so you can tell the practices apart and sign each WhatsApp message
  correctly.

The key is generated when the doctor signs up and shown on their Settings screen with a copy
button. Ask each doctor you are onboarding for theirs; there is no value to agree on in advance.

**If you serve more than one doctor from one n8n instance**, key your workflow's routing off
`doctor_id` (stable, a UUID) rather than off the clinic name, and store one API key + phone
number per doctor on your side.

---

## 3. Job A — endpoints you call

**Base URL:** `https://<project-ref>.functions.supabase.co`

> The dashboard's Settings screen displays all three full URLs with copy buttons, so the
> doctor can send you the exact values once the backend is deployed.

All three are `POST`, all take/return JSON, all require the `x-api-key` header of the doctor
the request is about. The base URL is the same for every doctor — the key does the routing.

---

### 3.1 `POST /appointments` — create a booking

The main one. Call it when a patient has agreed a slot on WhatsApp.

**Request**

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

| Field | Type | Required | Notes |
|---|---|---|---|
| `booking_id` | string | no | **Send it.** Your own id — makes the call idempotent (see below). |
| `patient_name` | string | **yes** | |
| `phone` | string | **yes** | With country code. We normalise it — see §6.1. |
| `age` | int | no | |
| `gender` | string | no | `male` \| `female` \| `other` |
| `scheduled_at` | string | **yes** | ISO 8601 **with offset**. See §6.2. |
| `reason` | string | no | Shown to the doctor as "reason for visit". Free text. |
| `meeting_link` | string | no | Per-appointment video link. Leave `null` to use the doctor's fixed room link. |

**Success — `201`**

```json
{ "appointment_id": "8f3c…", "patient_id": "1a7b…" }
```

**Already created — `200`**

If you resend the same `booking_id`, we return the original instead of duplicating:

```json
{ "appointment_id": "8f3c…", "deduplicated": true }
```

**Patient matching:** we look the patient up **by phone number**. New number → new patient
record. Existing number → the appointment attaches to that patient and their history
carries over. We only fill in `age`/`gender` if they're currently blank — we never
overwrite details the doctor has corrected by hand.

**Errors**

| Code | Body | Cause |
|---|---|---|
| `400` | `{"error":"Body must be valid JSON"}` | malformed body |
| `400` | `{"error":"Missing required field(s): phone, scheduled_at"}` | lists what's missing |
| `400` | `{"error":"scheduled_at must be an ISO 8601 timestamp"}` | unparseable date |
| `401` | `{"error":"Missing x-api-key header"}` / `{"error":"Invalid API key"}` | auth |
| `405` | `{"error":"Method not allowed"}` | not a POST |

**curl**

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/appointments" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <the doctor API key from Settings>" \
  -d '{
    "booking_id": "n8n-123",
    "patient_name": "Ravi Kumar",
    "phone": "+919876543210",
    "age": 34,
    "gender": "male",
    "scheduled_at": "2026-08-05T10:30:00+05:30",
    "reason": "fever and cough"
  }'
```

---

### 3.2 `POST /appointments/{appointment_id}/cancel`

Patient cancelled over WhatsApp. Sets the appointment to `cancelled`.

Empty body is fine. Use the `appointment_id` we returned at booking time.

**Success — `200`**

```json
{ "appointment_id": "8f3c…", "status": "cancelled" }
```

**`404`** — `{"error":"Appointment not found"}`

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/appointments/8f3c…/cancel" \
  -H "x-api-key: <the doctor API key from Settings>"
```

> This does **not** fire the `appointment-updated` webhook back at you — you already know,
> you're the one who called it.

---

### 3.3 `POST /prescription-delivery-callback`

Optional but recommended. Tell us whether the WhatsApp send actually landed.

**Request**

```json
{ "appointment_id": "8f3c…", "status": "sent" }
```

`status` must be exactly `sent` or `failed`.

**Success — `200`**

```json
{ "consultation_id": "44de…", "whatsapp_delivery_status": "sent" }
```

**`404`** — `{"error":"No consultation found for that appointment"}`

**Why bother:** `failed` puts a persistent red **Retry** banner on that appointment in the
dashboard, so the doctor knows the patient never got their prescription and can resend with
one click. Without this callback the dashboard only knows whether *your webhook* accepted
the request, not whether WhatsApp delivered it.

---

## 4. Job B — webhooks you expose

Each doctor pastes their **base URL** into Settings (e.g. `https://your-n8n.app/webhook`) and we
append the paths below. Both get that doctor's `x-api-key` header, and both bodies start with the
three sender fields:

```json
{
  "doctor_id": "9c1e…",
  "doctor_name": "Dr. Asha Rao",
  "clinic_name": "Sunrise Clinic"
}
```

Two doctors may point at the same n8n base URL, so do not assume one workflow run means one
practice — read `doctor_id`.

### 4.1 `POST {base}/send-prescription`

Fires when the doctor clicks **Complete & Send to Patient**. This is the important one —
send the patient their prescription on WhatsApp.

```json
{
  "doctor_id": "9c1e…",
  "doctor_name": "Dr. Asha Rao",
  "clinic_name": "Sunrise Clinic",
  "patient_phone": "+919876543210",
  "patient_name": "Ravi Kumar",
  "pdf_url": "https://<project-ref>.supabase.co/storage/v1/object/public/prescriptions/9c1e…/8f3c…/prescription-1754.pdf",
  "text_summary": "*Sunrise Clinic*\nDr. Asha Rao, MBBS\n\n*Prescription for Ravi Kumar*\nDate: 5 Aug 2026\n…",
  "appointment_id": "8f3c…"
}
```

| Field | Notes |
|---|---|
| `pdf_url` | Publicly readable — send it as a WhatsApp document. Can be `null` if PDF generation failed; fall back to the text. |
| `text_summary` | Ready to send as-is. Already formatted with WhatsApp markup (`*bold*`) and newlines. |
| `appointment_id` | Pass this straight back to the delivery callback in §3.3. |
| `doctor_id` | Which practice this is. Use it to pick the right WhatsApp sender / template. |

**Respond `2xx` if you accepted it.** Any non-2xx and the dashboard marks the delivery
failed and shows the Retry banner immediately.

### 4.2 `POST {base}/appointment-updated`

Fires when the **doctor** changes something, so you can tell the patient.

```json
{
  "event": "rescheduled",
  "appointment_id": "8f3c…",
  "patient_phone": "+919876543210",
  "patient_name": "Ravi Kumar",
  "scheduled_at": "2026-08-06T11:00:00.000Z",
  "follow_up_date": null
}
```

| `event` | When | What to message |
|---|---|---|
| `rescheduled` | doctor moved the slot | new date/time — read `scheduled_at` |
| `cancelled` | doctor cancelled | apology + rebook offer |
| `no_show` | patient didn't turn up | rebook offer |
| `follow_up_set` | doctor set a follow-up date | schedule a reminder for `follow_up_date` |

`scheduled_at` is always present. `follow_up_date` is a bare date (`YYYY-MM-DD`) and is only
meaningful for `follow_up_set`.

---

## 5. ⚠️ CORS — read this one

**The dashboard calls your two webhooks from the doctor's browser, not from a server.**

Your n8n webhooks must therefore allow the dashboard's origin:

```
Access-Control-Allow-Origin: https://<the-vercel-domain>
Access-Control-Allow-Headers: content-type, x-api-key
Access-Control-Allow-Methods: POST, OPTIONS
```

and answer the `OPTIONS` preflight with a `2xx`.

If you skip this, everything *looks* right — n8n receives nothing, and the doctor sees
"WhatsApp delivery failed" with a Retry button that keeps failing. It is the single most
likely thing to go wrong on first connection, and the browser console will show a CORS
error rather than anything useful in the n8n logs.

---

## 6. Field reference & gotchas

### 6.1 Phone numbers

We normalise before storing: everything except digits is stripped, and a leading `+` is
preserved. `+91 98765-43210` and `+919876543210` become the same patient. **The phone number
is the identity key** — same number means same patient and same history.

Send it with the country code.

### 6.2 Timestamps

Send `scheduled_at` as ISO 8601 **with an explicit offset**:

✅ `2026-08-05T10:30:00+05:30`
✅ `2026-08-05T05:00:00Z`
❌ `2026-08-05 10:30:00` — no offset, will be misread
❌ `05/08/2026 10:30 AM`

We store UTC and the dashboard always displays IST in 12-hour format. Values we send back to
you are UTC (`…Z`) — convert to IST before putting them in a patient message.

### 6.3 Appointment status lifecycle

```
booked ──► in_progress ──► completed
   │
   ├──► cancelled     (patient via your API, or doctor on dashboard)
   └──► no_show       (doctor only)
```

You only ever set `booked` (by creating one) and `cancelled` (via §3.2). The rest is the
doctor's side.

### 6.4 Retries

`/appointments` is idempotent **only if you send `booking_id`**. Without it, two calls create
two appointments. Please send it.

---

## 7. Testing checklist

Work through this once the backend is deployed and you have the base URL + secret:

- [ ] `POST /appointments` returns `201` with an `appointment_id`
- [ ] The appointment appears on the doctor's dashboard **within a second, without refreshing**
- [ ] Same `booking_id` again returns `"deduplicated": true`, no second appointment
- [ ] Same phone, new `booking_id` → same patient, appointment added to their history
- [ ] Missing `phone` returns `400` naming the field
- [ ] Wrong `x-api-key` returns `401`
- [ ] With doctor A's key, `POST /appointments/{an appointment of doctor B}/cancel` returns `404`
- [ ] A booking sent with doctor A's key appears on doctor A's dashboard and **not** on doctor B's
- [ ] `POST /appointments/{id}/cancel` flips the card to *Cancelled*
- [ ] Doctor completes a consultation → your `/send-prescription` webhook fires with a
      working `pdf_url` (open it — it should be a real PDF)
- [ ] `POST /prescription-delivery-callback` with `"failed"` → red Retry banner appears
- [ ] Same with `"sent"` → banner clears
- [ ] Doctor reschedules → your `/appointment-updated` fires with `"event":"rescheduled"`

---

## 8. Current status (as of handoff)

| Piece | State |
|---|---|
| Dashboard frontend | Built, typechecked, builds clean. **Not yet deployed.** |
| Database schema | Written (`supabase/schema.sql`). **Not yet run.** |
| Edge Functions (§3) | Written (`supabase/functions/`). **Not yet deployed.** |
| End-to-end test | **Not yet run** — needs a live Supabase project |

**Nothing is live yet.** The endpoint URLs above will only exist once someone runs:

```bash
supabase link --project-ref <project-ref>
supabase functions deploy appointments
supabase functions deploy prescription-delivery-callback
```

Until then you can build the n8n workflow against the contract in this document — it will not
change — but you cannot call the endpoints. Ask for the base URL when the backend goes up, and
for one API key per doctor you are onboarding.

Full setup steps are in the repo [`README.md`](../README.md).

---

## 9. Questions

The contract above is the whole surface area. If something here is ambiguous or you need an
extra field, say so early — adding a field to the payload is easy, changing it after both
sides are built is not.
