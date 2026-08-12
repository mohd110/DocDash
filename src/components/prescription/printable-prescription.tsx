import { formatDate, formatDateTime } from '@/lib/date'
import type { PrescriptionData } from '@/lib/prescription-data'

function Cell({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-[0.6rem] font-bold uppercase tracking-wider text-bottle-600 print:text-black/60">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-black">{value}</p>
    </div>
  )
}

/**
 * The prescription as printable HTML — the same layout as the PDF, but rendered
 * by the browser so `window.print()` reaches any printer without waiting on the
 * PDF renderer. Backgrounds are kept light because browsers strip them by
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
      {/* ------------------------------------------------------ clinic header */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-bottle-600 pb-4 print:border-black">
        <div className="flex min-w-0 items-start gap-4">
          {settings.logo_url && (
            <img
              src={settings.logo_url}
              alt=""
              className="size-16 shrink-0 object-contain"
              crossOrigin="anonymous"
            />
          )}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-bottle-700 print:text-black">
              {clinicName}
            </h1>
            <p className="mt-1 text-sm font-bold">{doctorName}</p>
            {settings.qualifications && (
              <p className="text-xs text-black/70">{settings.qualifications}</p>
            )}
            {settings.registration_no && (
              <p className="text-xs text-black/70">Reg. No. {settings.registration_no}</p>
            )}
            {settings.address && (
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-black/70">{settings.address}</p>
            )}
          </div>
        </div>
        <span
          className="font-display text-4xl leading-none text-bottle-400 print:text-black/40"
          aria-label="Prescription"
        >
          ℞
        </span>
      </header>

      {/* ----------------------------------------------------- patient details */}
      <section className="mt-5 grid grid-cols-3 gap-x-6 gap-y-3 rounded-lg border border-black/15 p-4">
        <Cell label="Patient" value={patient.full_name} wide />
        <Cell label="Date" value={formatDate(appointment.scheduled_at)} />
        <Cell label="Age" value={patient.age != null ? `${patient.age} yrs` : '—'} />
        <Cell label="Gender" value={patient.gender || '—'} />
        <Cell label="Phone" value={patient.phone} />
        {appointment.reason && <Cell label="Reason for visit" value={appointment.reason} wide />}
        {patient.allergies && <Cell label="Allergies" value={patient.allergies} />}
        {patient.chronic_conditions && (
          <Cell label="Chronic conditions" value={patient.chronic_conditions} wide />
        )}
      </section>

      {/* --------------------------------------------------------- diagnosis */}
      {consultation.diagnosis && (
        <section className="mt-5">
          <h2 className="text-[0.65rem] font-bold uppercase tracking-widest text-bottle-600 print:text-black">
            Findings / Diagnosis
          </h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
            {consultation.diagnosis}
          </p>
        </section>
      )}

      {/* --------------------------------------------------------- medicines */}
      {meds.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[0.65rem] font-bold uppercase tracking-widest text-bottle-600 print:text-black">
            Medicines
          </h2>
          <table className="mt-1.5 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-bottle-600 text-cream-100 print:bg-black/85">
                <th className="border border-black/15 px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider">
                  #
                </th>
                <th className="border border-black/15 px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider">
                  Medicine
                </th>
                <th className="border border-black/15 px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider">
                  Dosage
                </th>
                <th className="border border-black/15 px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider">
                  Frequency
                </th>
                <th className="border border-black/15 px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider">
                  Duration
                </th>
                <th className="border border-black/15 px-2 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider">
                  Instructions
                </th>
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

      {/* ------------------------------------------------------------ advice */}
      {consultation.advice && (
        <section className="mt-5">
          <h2 className="text-[0.65rem] font-bold uppercase tracking-widest text-bottle-600 print:text-black">
            Advice / Notes
          </h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{consultation.advice}</p>
        </section>
      )}

      {consultation.follow_up_date && (
        <p className="mt-4 border-l-4 border-bottle-600 bg-bottle-50 px-3 py-2 text-sm font-bold print:border-black print:bg-transparent">
          Follow-up on {formatDate(`${consultation.follow_up_date}T00:00:00+05:30`)}
        </p>
      )}

      {/* --------------------------------------------------------- signature */}
      <footer className="mt-12 flex items-end justify-between gap-6 break-inside-avoid">
        <p className="text-[0.6rem] text-black/50">
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
          {settings.registration_no && (
            <p className="text-[0.6rem] text-black/60">Reg. No. {settings.registration_no}</p>
          )}
        </div>
      </footer>
    </article>
  )
}
