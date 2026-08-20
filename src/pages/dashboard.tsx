import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Stethoscope,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/dashboard/stat-card'
import { AppointmentCard } from '@/components/appointments/appointment-card'
import { NewAppointmentDialog } from '@/components/appointments/new-appointment-dialog'
import { useTodayStats } from '@/hooks/useAppointments'
import { useDoctorProfile } from '@/hooks/useDoctor'
import { formatTime, istNow, relativeToNow } from '@/lib/date'
import { describePatient, initials } from '@/lib/utils'
import type { AppointmentWithPatient } from '@/lib/types'

function greeting() {
  const hour = istNow().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** In progress beats upcoming — that patient is already on the call. */
function pickNext(appointments: AppointmentWithPatient[]): AppointmentWithPatient | undefined {
  return (
    appointments.find((a) => a.status === 'in_progress') ??
    appointments.find((a) => a.status === 'booked')
  )
}

function NextUpHero({ appointment }: { appointment: AppointmentWithPatient }) {
  const navigate = useNavigate()
  const patient = appointment.patient

  return (
    <div className="overflow-hidden rounded-2xl bg-brand-600 text-surface-100 shadow-lift">
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-surface-100/15 font-display text-xl font-semibold">
            {initials(patient?.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-surface-100/70">
              {appointment.status === 'in_progress' ? 'In progress' : 'Next appointment'}
            </p>
            <h2 className="mt-1.5 truncate font-display text-3xl font-semibold">
              {patient?.full_name ?? 'Patient'}
            </h2>
            <p className="mt-1 text-sm text-surface-100/80">
              {describePatient(patient?.age, patient?.gender)}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-100/15 px-3.5 py-1.5 text-sm font-semibold">
              <Clock3 className="size-4" />
              {formatTime(appointment.scheduled_at)} · {relativeToNow(appointment.scheduled_at)}
            </p>
            {appointment.reason && (
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-surface-100/85">
                “{appointment.reason}”
              </p>
            )}
          </div>
        </div>

        <Button
          size="xl"
          variant="secondary"
          className="w-full shrink-0 lg:w-auto"
          onClick={() => navigate(`/consult/${appointment.id}`)}
        >
          <Stethoscope />
          Open Consultation
          <ArrowRight />
        </Button>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading } = useTodayStats()
  const { data: doctor } = useDoctorProfile()
  const [walkIn, setWalkIn] = React.useState(false)

  const appointments = data?.appointments ?? []
  const next = pickNext(appointments)
  const doctorName = doctor?.full_name?.trim()

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {greeting()}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-brand-800 sm:text-4xl">
            {doctorName || 'Your clinic'} — today at a glance
          </h1>
        </div>

        {/* Walk-ins never come through WhatsApp — this is the way in for them. */}
        <Button size="lg" className="shrink-0" onClick={() => setWalkIn(true)}>
          <Stethoscope />
          New / Walk-in
        </Button>
      </header>

      {/* ------------------------------------------------------- count cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <StatCard
              label="Today's appointments"
              value={data?.total ?? 0}
              icon={CalendarDays}
              tone="green"
            />
            <StatCard label="Completed" value={data?.completed ?? 0} icon={CalendarCheck} />
            <StatCard
              label="Upcoming next"
              value={data?.upcoming ?? 0}
              icon={Clock3}
              tone="blue"
              hint={data?.inProgress ? `${data.inProgress} in progress` : undefined}
            />
            <StatCard
              label="New patients"
              value={data?.newPatients ?? 0}
              icon={UserPlus}
              tone="amber"
              hint="Registered today"
            />
          </>
        )}
      </div>

      {/* --------------------------------------------------------- hero card */}
      {isLoading ? (
        <Skeleton className="h-44 rounded-2xl" />
      ) : next ? (
        <NextUpHero appointment={next} />
      ) : (
        <EmptyState
          emoji="🎉"
          title={appointments.length ? 'All done for today' : 'No appointments today 🎉'}
          description={
            appointments.length
              ? 'Every patient on today’s list has been seen. New WhatsApp bookings will appear here automatically.'
              : 'When the WhatsApp agent books someone, they will pop up here instantly — no refresh needed.'
          }
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => setWalkIn(true)}>
                <Stethoscope />
                Start a walk-in
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/appointments">See upcoming appointments</Link>
              </Button>
            </div>
          }
        />
      )}

      {/* --------------------------------------------------- today's timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-brand-800">Today’s schedule</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/appointments">
              View all
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : appointments.length === 0 ? (
          <EmptyState
            emoji="🌿"
            title="Nothing on the calendar"
            description="Your day is clear. Bookings from WhatsApp land here the moment they are made — or start a walk-in yourself."
            action={
              <Button size="lg" onClick={() => setWalkIn(true)}>
                <Stethoscope />
                Start a walk-in
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                highlight={appointment.id === next?.id}
              />
            ))}
          </div>
        )}
      </section>

      <NewAppointmentDialog open={walkIn} onOpenChange={setWalkIn} />
    </div>
  )
}
