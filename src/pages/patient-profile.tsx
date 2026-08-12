import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowLeft, CalendarPlus, Pencil, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'
import { PatientFormDialog } from '@/components/patients/patient-form-dialog'
import { BookAppointmentDialog } from '@/components/patients/book-appointment-dialog'
import { VisitCard } from '@/components/prescription/visit-card'
import { usePatient, usePatientHistory } from '@/hooks/usePatients'
import { formatDate } from '@/lib/date'
import { describePatient, initials } from '@/lib/utils'

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
