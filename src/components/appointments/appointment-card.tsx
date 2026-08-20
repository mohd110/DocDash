import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Phone,
  Printer,
  UserX,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { StatusBadge } from './status-badge'
import { RescheduleDialog } from './reschedule-dialog'
import { useAppointmentActions } from '@/hooks/useAppointments'
import { useResendPrescription } from '@/hooks/usePrescriptionDelivery'
import { useRealtime } from '@/hooks/useRealtime'
import { formatDateShort, formatTime, isTodayIST } from '@/lib/date'
import { STATUS_META, isOpen } from '@/lib/status'
import { cn, describePatient, initials } from '@/lib/utils'
import type { AppointmentWithPatient } from '@/lib/types'

export function AppointmentCard({
  appointment,
  showDate = false,
  highlight = false,
}: {
  appointment: AppointmentWithPatient
  /** Upcoming/Past lists span days, so they print the date too. */
  showDate?: boolean
  /** Marks the next patient the doctor should see. */
  highlight?: boolean
}) {
  const navigate = useNavigate()
  const { freshIds } = useRealtime()
  const { setStatus, reschedule } = useAppointmentActions()
  const resend = useResendPrescription()

  const [confirm, setConfirm] = React.useState<null | 'cancel' | 'no_show'>(null)
  const [rescheduling, setRescheduling] = React.useState(false)

  const patient = appointment.patient
  const meta = STATUS_META[appointment.status]
  const isFresh = freshIds.has(appointment.id)
  const deliveryFailed = appointment.consultation?.whatsapp_delivery_status === 'failed'
  const open = isOpen(appointment.status)

  return (
    <div
      className={cn(
        'group rounded-2xl border border-surface-500/40 border-l-4 bg-card shadow-card transition-shadow hover:shadow-lift',
        meta.accent,
        highlight && 'ring-2 ring-brand-400 ring-offset-2 ring-offset-background',
        isFresh && 'animate-pop-in ring-2 ring-amber-300',
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
        {/* ----------------------------------------------------------- time */}
        <div className="flex shrink-0 items-center gap-4 lg:w-36 lg:flex-col lg:items-start lg:gap-1">
          <div className="font-display text-2xl font-semibold leading-none text-brand-800">
            {formatTime(appointment.scheduled_at)}
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {showDate && !isTodayIST(appointment.scheduled_at)
              ? formatDateShort(appointment.scheduled_at)
              : 'Today'}
          </div>
        </div>

        {/* -------------------------------------------------------- patient */}
        <button
          type="button"
          onClick={() => navigate(`/consult/${appointment.id}`)}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-xl text-left transition-colors hover:bg-surface-100/60"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-base font-semibold text-brand-700">
            {initials(patient?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="truncate font-display text-lg font-semibold text-brand-800">
                {patient?.full_name ?? 'Unknown patient'}
              </span>
              <StatusBadge status={appointment.status} />
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {describePatient(patient?.age, patient?.gender)}
              {patient?.phone && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Phone className="inline size-3" />
                  {patient.phone}
                </span>
              )}
            </p>
            {appointment.reason && (
              <p className="mt-1.5 line-clamp-2 rounded-lg bg-surface-200/70 px-3 py-1.5 text-sm text-brand-800">
                {appointment.reason}
              </p>
            )}
          </div>
        </button>

        {/* -------------------------------------------------------- actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="lg" onClick={() => navigate(`/consult/${appointment.id}`)}>
            {appointment.status === 'completed' ? 'View' : 'Open'}
            <ChevronRight />
          </Button>

          {/* A finished visit can be reprinted straight from the list. */}
          {appointment.status === 'completed' && appointment.consultation && (
            <Button variant="outline" size="lg" asChild title="Print prescription">
              <Link to={`/prescription/${appointment.id}`} target="_blank">
                <Printer />
                <span className="sr-only sm:not-sr-only">Print</span>
              </Link>
            </Button>
          )}

          {open && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setRescheduling(true)}
                title="Reschedule"
                aria-label="Reschedule"
              >
                <CalendarClock />
                <span className="sr-only sm:not-sr-only">Reschedule</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setConfirm('no_show')}
                title="Mark as no-show"
                aria-label="Mark as no-show"
              >
                <UserX />
                <span className="sr-only sm:not-sr-only">No-show</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-destructive hover:border-destructive/50 hover:bg-red-50"
                onClick={() => setConfirm('cancel')}
                title="Cancel appointment"
                aria-label="Cancel appointment"
              >
                <XCircle />
                <span className="sr-only sm:not-sr-only">Cancel</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ---------------------------------------- persistent retry banner (§7.8) */}
      {deliveryFailed && patient && (
        <div className="flex flex-col gap-3 rounded-b-2xl border-t border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle className="size-4 shrink-0" />
            The prescription did not reach {patient.full_name} on WhatsApp.
          </p>
          <Button
            variant="destructive"
            size="sm"
            loading={resend.isPending}
            onClick={() =>
              resend.mutate({
                patient,
                appointment,
                consultationId: appointment.consultation!.id,
              })
            }
          >
            Retry send
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={
          confirm === 'cancel'
            ? `Cancel ${patient?.full_name}'s appointment?`
            : `Mark ${patient?.full_name} as a no-show?`
        }
        description={
          confirm === 'cancel'
            ? 'The booking agent will let the patient know on WhatsApp.'
            : 'The slot closes and the patient is informed by the booking agent.'
        }
        confirmLabel={confirm === 'cancel' ? 'Yes, cancel it' : 'Yes, no-show'}
        onConfirm={() =>
          setStatus.mutateAsync({
            appointment,
            status: confirm === 'cancel' ? 'cancelled' : 'no_show',
          })
        }
      />

      <RescheduleDialog
        appointment={appointment}
        open={rescheduling}
        onOpenChange={setRescheduling}
        busy={reschedule.isPending}
        onConfirm={async (scheduledAt) => {
          try {
            await reschedule.mutateAsync({ appointment, scheduledAt })
            setRescheduling(false)
          } catch {
            // Failure is already toasted; leave the dialog open to retry.
          }
        }}
      />
    </div>
  )
}
