import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { PrintablePrescription } from '@/components/prescription/printable-prescription'
import { getConsultationByAppointment } from '@/api/consultations'
import { useAppointment } from '@/hooks/useAppointments'
import { useClinicSettings } from '@/hooks/useSettings'
import { useOpenPrescription, useResendPrescription } from '@/hooks/usePrescriptionDelivery'
import { qk } from '@/hooks/queryKeys'

/**
 * Standalone prescription sheet for an appointment: print it, download the PDF,
 * or re-send it on WhatsApp. Opened in its own tab so printing never picks up
 * the dashboard chrome around it.
 */
export function PrescriptionPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()

  const { data: appointment, isLoading: loadingAppointment } = useAppointment(appointmentId)
  const { data: settings } = useClinicSettings()
  const resend = useResendPrescription()
  const preview = useOpenPrescription()

  const { data: consultation, isLoading: loadingConsultation } = useQuery({
    queryKey: qk.consultation(appointmentId ?? ''),
    queryFn: () => getConsultationByAppointment(appointmentId!),
    enabled: Boolean(appointmentId),
  })

  if (loadingAppointment || loadingConsultation || !settings) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-[60vh] rounded-2xl" />
      </div>
    )
  }

  const patient = appointment?.patient

  if (!appointment || !patient || !consultation) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <EmptyState
          emoji="📄"
          title="No prescription yet"
          description="This appointment has no consultation recorded. Open it, write the findings and medicines, then complete it to produce a prescription."
          action={
            <Button asChild size="lg">
              <Link to={appointmentId ? `/consult/${appointmentId}` : '/appointments'}>
                Open consultation
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const data = { patient, appointment, consultation, settings }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Toolbar is stripped from the printed page by the .no-print rule. */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate(-1)}>
          <ArrowLeft />
          Back
        </Button>

        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="lg"
            loading={preview.isPending}
            onClick={() => preview.mutate(data)}
          >
            <Download />
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="lg"
            loading={resend.isPending}
            onClick={() =>
              resend.mutate({ patient, appointment, consultationId: consultation.id })
            }
          >
            <Send />
            Send on WhatsApp
          </Button>
          <Button size="lg" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </div>
      </div>

      <PrintablePrescription {...data} />
    </div>
  )
}
