import { Link } from 'react-router-dom'
import { Download, FileText, Printer, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOpenPrescription, useResendPrescription } from '@/hooks/usePrescriptionDelivery'
import { useDoctorProfile } from '@/hooks/useDoctor'
import { formatDate } from '@/lib/date'
import type { Patient, VisitHistoryEntry } from '@/lib/types'

/**
 * One completed visit, in full: diagnosis, medicines, advice, follow-up, plus
 * the actions that turn it back into a document. Shared by the patient profile
 * and the History tab of the consult screen so the two never drift apart.
 */
export function VisitCard({
  visit,
  patient,
  compact = false,
}: {
  visit: VisitHistoryEntry
  patient: Patient
  /** Trims the padding for the narrower consult column. */
  compact?: boolean
}) {
  const resend = useResendPrescription()
  const preview = useOpenPrescription()
  const { data: doctor } = useDoctorProfile()
  const when = visit.completed_at ?? visit.appointment?.scheduled_at ?? visit.created_at

  return (
    <div
      className={`rounded-2xl border border-surface-500/40 bg-card shadow-card ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-brand-800">{formatDate(when)}</p>
          {visit.appointment?.reason && (
            <p className="mt-0.5 text-sm text-muted-foreground">{visit.appointment.reason}</p>
          )}
        </div>
        {visit.whatsapp_delivery_status === 'failed' && <Badge tone="red">Delivery failed</Badge>}
        {visit.whatsapp_delivery_status === 'sent' && <Badge tone="green">Sent</Badge>}
      </div>

      {visit.diagnosis && (
        <div className="mt-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-brand-600">
            Diagnosis
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{visit.diagnosis}</p>
        </div>
      )}

      {visit.prescription_items.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[0.68rem] uppercase tracking-wider text-brand-600">
                <th className="pb-1.5 pr-3 font-bold">Medicine</th>
                <th className="pb-1.5 pr-3 font-bold">Dosage</th>
                <th className="pb-1.5 pr-3 font-bold">Frequency</th>
                <th className="pb-1.5 pr-3 font-bold">Duration</th>
                <th className="pb-1.5 font-bold">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {visit.prescription_items.map((item) => (
                <tr key={item.id} className="border-t border-surface-500/40">
                  <td className="py-1.5 pr-3 font-semibold">{item.medicine_name}</td>
                  <td className="py-1.5 pr-3">{item.dosage || '—'}</td>
                  <td className="py-1.5 pr-3">{item.frequency || '—'}</td>
                  <td className="py-1.5 pr-3">{item.duration || '—'}</td>
                  <td className="py-1.5">{item.instructions || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visit.advice && (
        <div className="mt-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-brand-600">Advice</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{visit.advice}</p>
        </div>
      )}

      {visit.follow_up_date && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Follow-up: </span>
          {formatDate(`${visit.follow_up_date}T00:00:00+05:30`)}
        </p>
      )}

      {visit.appointment && (
        <div className="mt-5 flex flex-wrap gap-2.5 border-t border-surface-500/40 pt-4">
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
