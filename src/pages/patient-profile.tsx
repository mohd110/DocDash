import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  FileText,
  Pencil,
  Phone,
  Send,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'
import { PatientFormDialog } from '@/components/patients/patient-form-dialog'
import { BookAppointmentDialog } from '@/components/patients/book-appointment-dialog'
import { usePatient, usePatientHistory } from '@/hooks/usePatients'
import { useOpenPrescription, useResendPrescription } from '@/hooks/usePrescriptionDelivery'
import { useClinicSettings } from '@/hooks/useSettings'
import { formatDate } from '@/lib/date'
import { describePatient, initials } from '@/lib/utils'
import type { Patient, VisitHistoryEntry } from '@/lib/types'

function InfoTile({
  label,
  value,
  icon,
  tone = 'plain',
}: {
  label: string
  value: string
  icon?: React.ReactNode
  tone?: 'plain' | 'warn'
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        tone === 'warn'
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-cream-500/50 bg-cream-100/70 text-bottle-800'
      }`}
    >
      <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider opacity-75">
        {icon}
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  )
}

function VisitCard({ visit, patient }: { visit: VisitHistoryEntry; patient: Patient }) {
  const resend = useResendPrescription()
  const preview = useOpenPrescription()
  const { data: settings } = useClinicSettings()
  const when = visit.completed_at ?? visit.appointment?.scheduled_at ?? visit.created_at

  return (
    <div className="rounded-2xl border border-cream-500/40 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-bottle-800">{formatDate(when)}</p>
          {visit.appointment?.reason && (
            <p className="mt-0.5 text-sm text-muted-foreground">{visit.appointment.reason}</p>
          )}
        </div>
        {visit.whatsapp_delivery_status === 'failed' && <Badge tone="red">Delivery failed</Badge>}
        {visit.whatsapp_delivery_status === 'sent' && <Badge tone="green">Sent</Badge>}
      </div>

      {visit.diagnosis && (
        <div className="mt-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-bottle-600">
            Diagnosis
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{visit.diagnosis}</p>
        </div>
      )}

      {visit.prescription_items.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[0.68rem] uppercase tracking-wider text-bottle-600">
                <th className="pb-1.5 pr-3 font-bold">Medicine</th>
                <th className="pb-1.5 pr-3 font-bold">Dosage</th>
                <th className="pb-1.5 pr-3 font-bold">Frequency</th>
                <th className="pb-1.5 pr-3 font-bold">Duration</th>
                <th className="pb-1.5 font-bold">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {visit.prescription_items.map((item) => (
                <tr key={item.id} className="border-t border-cream-500/40">
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
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-bottle-600">
            Advice
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{visit.advice}</p>
        </div>
      )}

      {visit.follow_up_date && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Follow-up: </span>
          {formatDate(`${visit.follow_up_date}T00:00:00+05:30`)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5 border-t border-cream-500/40 pt-4">
        {visit.prescription_pdf_url ? (
          <Button variant="outline" size="sm" asChild>
            <a href={visit.prescription_pdf_url} target="_blank" rel="noreferrer">
              <FileText />
              View Prescription
            </a>
          </Button>
        ) : (
          settings &&
          visit.appointment && (
            <Button
              variant="outline"
              size="sm"
              loading={preview.isPending}
              onClick={() =>
                preview.mutate({
                  patient,
                  appointment: visit.appointment!,
                  consultation: visit,
                  settings,
                })
              }
            >
              <FileText />
              View Prescription
            </Button>
          )
        )}

        {visit.appointment && (
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
            Re-send on WhatsApp
          </Button>
        )}
      </div>
    </div>
  )
}

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: patient, isLoading } = usePatient(id)
  const { data: history = [], isLoading: loadingHistory } = usePatientHistory(id)
  const [editing, setEditing] = React.useState(false)
  const [booking, setBooking] = React.useState(false)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-40 rounded-2xl" />
        <ListSkeleton rows={2} />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-bottle-800">Patient not found</h1>
        <Button className="mt-6" onClick={() => navigate('/patients')}>
          Back to patients
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/patients">
          <ArrowLeft />
          All patients
        </Link>
      </Button>

      {/* ------------------------------------------------------------ header */}
      <div className="rounded-2xl border border-cream-500/40 bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-bottle-100 font-display text-xl font-semibold text-bottle-700">
              {initials(patient.full_name)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl font-semibold text-bottle-800">
                {patient.full_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {describePatient(patient.age, patient.gender)} · Patient since{' '}
                {formatDate(patient.created_at)}
              </p>
              <a
                href={`tel:${patient.phone}`}
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-bottle-600 hover:underline"
              >
                <Phone className="size-4" />
                {patient.phone}
              </a>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="outline" size="lg" onClick={() => setEditing(true)}>
              <Pencil />
              Edit
            </Button>
            <Button size="lg" onClick={() => setBooking(true)}>
              <CalendarPlus />
              Book appointment
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoTile
            label="Allergies"
            value={patient.allergies || 'None recorded'}
            icon={<AlertTriangle className="size-3.5" />}
            tone={patient.allergies ? 'warn' : 'plain'}
          />
          <InfoTile
            label="Chronic conditions"
            value={patient.chronic_conditions || 'None recorded'}
            icon={<Activity className="size-3.5" />}
          />
        </div>
      </div>

      {/* ----------------------------------------------------- visit history */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-bottle-800">
          Visit history
          {!loadingHistory && history.length > 0 && (
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              ({history.length})
            </span>
          )}
        </h2>

        {loadingHistory ? (
          <ListSkeleton rows={2} />
        ) : history.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="No completed visits yet"
            description="Once a consultation is completed, the full prescription shows up here and can be re-sent any time."
          />
        ) : (
          <div className="space-y-4">
            {history.map((visit) => (
              <VisitCard key={visit.id} visit={visit} patient={patient} />
            ))}
          </div>
        )}
      </section>

      <PatientFormDialog open={editing} onOpenChange={setEditing} patient={patient} />
      <BookAppointmentDialog patient={patient} open={booking} onOpenChange={setBooking} />
    </div>
  )
}
