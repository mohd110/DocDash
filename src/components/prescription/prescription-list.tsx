import { Link } from 'react-router-dom'
import { Download, FileText, Pill, Printer, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useOpenPrescription, useResendPrescription } from '@/hooks/usePrescriptionDelivery'
import { useDoctorProfile } from '@/hooks/useDoctor'
import { formatDate } from '@/lib/date'
import type { Patient, VisitHistoryEntry } from '@/lib/types'

function Row({ visit, patient }: { visit: VisitHistoryEntry; patient: Patient }) {
  const resend = useResendPrescription()
  const preview = useOpenPrescription()
  const { data: doctor } = useDoctorProfile()
  const when = visit.completed_at ?? visit.appointment?.scheduled_at ?? visit.created_at
  const meds = visit.prescription_items

  return (
    <div className="rounded-xl border border-surface-500/50 bg-surface-100/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-brand-800">{formatDate(when)}</p>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {visit.diagnosis || visit.appointment?.reason || 'No diagnosis recorded'}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-200 px-3 py-1 text-xs font-bold text-brand-700">
          <Pill className="size-3.5" />
          {meds.length} {meds.length === 1 ? 'medicine' : 'medicines'}
        </span>
      </div>

      {meds.length > 0 && (
        <ul className="mt-3 space-y-1">
          {meds.map((item) => (
            <li key={item.id} className="text-sm">
              <span className="font-semibold">{item.medicine_name}</span>
              {[item.dosage, item.frequency, item.duration, item.instructions].filter(Boolean)
                .length > 0 && (
                <span className="text-muted-foreground">
                  {' — '}
                  {[item.dosage, item.frequency, item.duration, item.instructions]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {visit.appointment && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/prescription/${visit.appointment.id}`} target="_blank">
              <Printer />
              Print
            </Link>
          </Button>

          {visit.prescription_pdf_url ? (
            <Button variant="outline" size="sm" asChild>
              <a href={visit.prescription_pdf_url} target="_blank" rel="noreferrer">
                <FileText />
                View PDF
              </a>
            </Button>
          ) : (
            doctor && (
              <Button
                variant="outline"
                size="sm"
                loading={preview.isPending}
                onClick={() =>
                  preview.mutate({
                    patient,
                    appointment: visit.appointment!,
                    consultation: visit,
                    doctor,
                  })
                }
              >
                <Download />
                Download PDF
              </Button>
            )
          )}

          <Button
            size="sm"
            loading={resend.isPending}
            onClick={() =>
              resend.mutate({
                patient,
                appointment: visit.appointment!,
                consultationId: visit.id,
              })
            }
          >
            <Send />
            Re-send
          </Button>
        </div>
      )}
    </div>
  )
}

/** Document-focused view of every prescription this patient has been given. */
export function PrescriptionList({
  visits,
  patient,
}: {
  visits: VisitHistoryEntry[]
  patient: Patient
}) {
  if (visits.length === 0) {
    return (
      <EmptyState
        emoji="📄"
        title="No prescriptions yet"
        description={`Nothing has been prescribed to ${patient.full_name} before. Once you complete this consultation it will appear here, ready to print or re-send.`}
      />
    )
  }

  return (
    <div className="space-y-3">
      {visits.map((visit) => (
        <Row key={visit.id} visit={visit} patient={patient} />
      ))}
    </div>
  )
}
