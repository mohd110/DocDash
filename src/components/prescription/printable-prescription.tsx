import { formatDate, formatDateTime } from '@/lib/date'
import type { PrescriptionData } from '@/lib/prescription-data'

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-24 shrink-0 font-semibold text-black/55">{label}</span>
      <span className="min-w-0 flex-1 font-medium">{value}</span>
    </div>
  )
}

/**
 * The prescription as printable HTML, laid out the way a paper script reads:
 *   1. clinic letterhead (logo + name)
 *   2. patient on the left, prescribing doctor on the right
 *   3. the prescription itself
 *
 * Rendered by the browser so `window.print()` reaches any printer without
 * waiting on the PDF renderer. Backgrounds stay light — browsers strip them by
 * default and cream would only waste ink.
 */
export function PrintablePrescription({
  patient,
  appointment,
  consultation,
  settings,
}: PrescriptionData) {
  const meds = consultation.prescription_items
  const clinicName = settings.clinic_name?.trim() || 'Hakiman Clinic'
  const doctorName = settings.doctor_name?.trim() || 'Dr. Salim'

  return (
    <article
      id="prescription-sheet"
      className="mx-auto w-full max-w-[210mm] bg-white p-8 text-black shadow-card print:max-w-none print:p-0 print:shadow-none"
    >
      {/* ── 1. clinic letterhead ─────────────────────────────────────────── */}
      <header className="flex items-center gap-4 border-b-4 border-bottle-600 pb-4 print:border-black">
        {settings.logo_url && (
          <img
            src={settings.logo_url}
            alt=""
            className="size-16 shrink-0 object-contain"
            crossOrigin="anonymous"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl uppercase tracking-tight text-bottle-700 print:text-black">
            {clinicName}
          </h1>
          {settings.address && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-black/65">{settings.address}</p>
          )}
        </div>
      </header>

      {/* ── 2. patient (left) · prescribing doctor (right) ───────────────── */}
      <section className="grid gap-6 border-b border-black/15 py-5 sm:grid-cols-[1.35fr_1fr]">
        <div className="space-y-1.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-bottle-600 print:text-black/60">
            Patient
          </p>
          <p className="font-display text-xl leading-tight">{patient.full_name}</p>
          <div className="space-y-1 pt-1">
            <Line
              label="Age / Sex"
              value={[
                patient.age != null ? `${patient.age} yrs` : null,
                patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : null,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            />
            <Line label="Phone" value={patient.phone} />
            <Line label="Date" value={formatDate(appointment.scheduled_at)} />
            {appointment.reason && <Line label="Complaint" value={appointment.reason} />}
            {patient.allergies && <Line label="Allergies" value={patient.allergies} />}
            {patient.chronic_conditions && (
              <Line label="Conditions" value={patient.chronic_conditions} />
            )}
          </div>
        </div>

        <div className="space-y-1.5 sm:border-l sm:border-black/15 sm:pl-6">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-bottle-600 print:text-black/60">
            Prescribed by
          </p>
          <p className="font-display text-xl leading-tight">{doctorName}</p>
          {settings.qualifications && (
            <p className="text-sm font-semibold text-black/75">{settings.qualifications}</p>
          )}
          {settings.registration_no && (
            <p className="text-xs text-black/60">Reg. No. {settings.registration_no}</p>
          )}
          {settings.working_hours && (
            <p className="pt-1 text-xs text-black/55">{settings.working_hours}</p>
          )}
        </div>
      </section>

      {/* ── 3. the prescription ──────────────────────────────────────────── */}
      <div className="flex items-start gap-4 pt-5">
        <span
          className="font-display text-5xl leading-none text-bottle-500 print:text-black/45"
          aria-label="Prescription"
        >
          ℞
        </span>

        <div className="min-w-0 flex-1 space-y-5">
          {consultation.diagnosis && (
            <section>
              <h2 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-bottle-600 print:text-black">
                Findings / Diagnosis
              </h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                {consultation.diagnosis}
              </p>
            </section>
          )}

          {meds.length > 0 && (
            <section>
              <h2 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-bottle-600 print:text-black">
                Medicines
              </h2>
              <table className="mt-1.5 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-bottle-600 text-cream-100 print:bg-black/85">
                    {['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="border border-black/15 px-2 py-1.5 text-[0.58rem] font-bold uppercase tracking-wider"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={m.id || i} className="break-inside-avoid">
                      <td className="border border-black/15 px-2 py-1.5">{i + 1}</td>
                      <td className="border border-black/15 px-2 py-1.5 font-semibold">
                        {m.medicine_name}
                      </td>
                      <td className="border border-black/15 px-2 py-1.5">{m.dosage || '—'}</td>
                      <td className="border border-black/15 px-2 py-1.5">{m.frequency || '—'}</td>
                      <td className="border border-black/15 px-2 py-1.5">{m.duration || '—'}</td>
                      <td className="border border-black/15 px-2 py-1.5">{m.instructions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {consultation.advice && (
            <section>
              <h2 className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-bottle-600 print:text-black">
                Advice / Notes
              </h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                {consultation.advice}
              </p>
            </section>
          )}

          {consultation.follow_up_date && (
            <p className="border-l-4 border-bottle-600 bg-bottle-50 px-3 py-2 text-sm font-bold print:border-black print:bg-transparent">
              Follow-up on {formatDate(`${consultation.follow_up_date}T00:00:00+05:30`)}
            </p>
          )}
        </div>
      </div>

      {/* ── signature ────────────────────────────────────────────────────── */}
      <footer className="mt-12 flex items-end justify-between gap-6 break-inside-avoid">
        <p className="text-[0.58rem] text-black/45">
          {clinicName} · Generated {formatDateTime(new Date().toISOString())} IST
        </p>
        <div className="text-right">
          {settings.signature_url && (
            <img
              src={settings.signature_url}
              alt=""
              className="ml-auto h-14 object-contain"
              crossOrigin="anonymous"
            />
          )}
          <p className="mt-1 border-t border-black/40 pt-1 text-sm font-bold">{doctorName}</p>
          {settings.qualifications && (
            <p className="text-[0.6rem] text-black/60">{settings.qualifications}</p>
          )}
        </div>
      </footer>
    </article>
  )
}
