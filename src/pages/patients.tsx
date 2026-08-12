import * as React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MessageCircle, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { ListSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PatientFormDialog } from '@/components/patients/patient-form-dialog'
import { usePatients } from '@/hooks/usePatients'
import { formatDate } from '@/lib/date'
import { describePatient, initials } from '@/lib/utils'

/** Debounced so each keystroke does not fire a query. */
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function PatientsPage() {
  const [search, setSearch] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const debounced = useDebounced(search)
  const { data: patients, isLoading } = usePatients(debounced)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-bottle-800 sm:text-4xl">
            Patients
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Everyone the clinic has seen — added automatically from WhatsApp bookings.
          </p>
        </div>
        <Button size="lg" onClick={() => setAdding(true)}>
          <UserPlus />
          Add Patient
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone number"
          className="pl-11"
          aria-label="Search patients"
        />
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (patients ?? []).length === 0 ? (
        <EmptyState
          emoji={debounced ? '🔍' : '🌱'}
          title={debounced ? 'No patients found' : 'No patients yet'}
          description={
            debounced
              ? 'Try part of the name, or the phone number with country code.'
              : 'Patients are created automatically when the WhatsApp agent books an appointment. You can also add a walk-in.'
          }
          action={
            !debounced && (
              <Button size="lg" onClick={() => setAdding(true)}>
                <UserPlus />
                Add the first patient
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2.5">
          {patients!.map((patient) => (
            <Link
              key={patient.id}
              to={`/patients/${patient.id}`}
              className="flex items-center gap-4 rounded-2xl border border-cream-500/40 bg-card p-4 shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bottle-100 font-display font-semibold text-bottle-700">
                {initials(patient.full_name)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-display text-lg font-semibold text-bottle-800">
                    {patient.full_name}
                  </span>
                  {patient.source === 'whatsapp' && (
                    <Badge tone="green">
                      <MessageCircle className="size-3" />
                      WhatsApp
                    </Badge>
                  )}
                  {patient.allergies && <Badge tone="amber">Allergies</Badge>}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {patient.phone} · {describePatient(patient.age, patient.gender)}
                </p>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Added
                </p>
                <p className="text-sm font-semibold text-bottle-700">
                  {formatDate(patient.created_at)}
                </p>
              </div>

              <ChevronRight className="size-5 shrink-0 text-bottle-500" />
            </Link>
          ))}
        </div>
      )}

      <PatientFormDialog open={adding} onOpenChange={setAdding} />
    </div>
  )
}
