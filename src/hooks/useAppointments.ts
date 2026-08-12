import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createAppointment,
  getAppointment,
  getTodayStats,
  listAppointments,
  listAppointmentsBetween,
  rescheduleAppointment,
  updateAppointmentStatus,
  type AppointmentScope,
} from '@/api/appointments'
import { getClinicSettings } from '@/api/settings'
import {
  N8nNotConfiguredError,
  notifyAppointmentUpdated,
  type AppointmentUpdateEvent,
} from '@/api/n8n'
import { formatDateTime } from '@/lib/date'
import type { AppointmentStatus, AppointmentWithPatient } from '@/lib/types'
import { APPOINTMENT_SCOPED_KEYS, qk } from './queryKeys'

export function useAppointments(scope: AppointmentScope, day?: string) {
  return useQuery({
    queryKey: qk.appointments(scope, day),
    queryFn: () => listAppointments(scope, day),
  })
}

/** All appointments across an IST date range — powers the calendar month view. */
export function useAppointmentsBetween(fromDay: string, toDay: string) {
  return useQuery({
    queryKey: qk.appointmentsRange(fromDay, toDay),
    queryFn: () => listAppointmentsBetween(fromDay, toDay),
  })
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: qk.appointment(id ?? ''),
    queryFn: () => getAppointment(id!),
    enabled: Boolean(id),
  })
}

export function useTodayStats() {
  return useQuery({ queryKey: qk.todayStats(), queryFn: getTodayStats })
}

export function useInvalidateAppointments() {
  const client = useQueryClient()
  return () => {
    for (const key of APPOINTMENT_SCOPED_KEYS) {
      client.invalidateQueries({ queryKey: [key] })
    }
  }
}

/**
 * Tells the WhatsApp agent that the doctor changed something on their side (§6).
 * Never throws — a messaging hiccup must not roll back the doctor's action.
 */
async function tellAgent(
  event: AppointmentUpdateEvent,
  appointment: AppointmentWithPatient,
  extra?: { follow_up_date?: string | null; note?: string | null },
) {
  try {
    const settings = await getClinicSettings()
    await notifyAppointmentUpdated(settings, {
      event,
      appointment_id: appointment.id,
      patient_phone: appointment.patient?.phone ?? '',
      patient_name: appointment.patient?.full_name ?? '',
      scheduled_at: appointment.scheduled_at,
      ...extra,
    })
  } catch (error) {
    if (error instanceof N8nNotConfiguredError) {
      toast.warning('Patient not notified', {
        description: 'Add your n8n webhook URL in Settings so the agent can message them.',
      })
    } else {
      toast.warning('Patient not notified', {
        description: (error as Error).message,
      })
    }
  }
}

const STATUS_TOAST: Record<AppointmentStatus, string> = {
  booked: 'Appointment reopened',
  in_progress: 'Consultation started',
  completed: 'Appointment completed',
  cancelled: 'Appointment cancelled',
  no_show: 'Marked as no-show',
}

export function useAppointmentActions() {
  const client = useQueryClient()
  const invalidate = useInvalidateAppointments()

  const setStatus = useMutation({
    mutationFn: async ({
      appointment,
      status,
    }: {
      appointment: AppointmentWithPatient
      status: AppointmentStatus
    }) => {
      const updated = await updateAppointmentStatus(appointment.id, status)
      // Only cancel / no-show need to reach the patient via the agent.
      if (status === 'cancelled') await tellAgent('cancelled', updated)
      if (status === 'no_show') await tellAgent('no_show', updated)
      return updated
    },
    onSuccess: (updated) => {
      client.setQueryData(qk.appointment(updated.id), updated)
      invalidate()
      toast.success(STATUS_TOAST[updated.status])
    },
    onError: (error: Error) =>
      toast.error('Could not update the appointment', { description: error.message }),
  })

  const reschedule = useMutation({
    mutationFn: async ({
      appointment,
      scheduledAt,
    }: {
      appointment: AppointmentWithPatient
      scheduledAt: string
    }) => {
      const updated = await rescheduleAppointment(appointment.id, scheduledAt)
      await tellAgent('rescheduled', updated)
      return updated
    },
    onSuccess: (updated) => {
      client.setQueryData(qk.appointment(updated.id), updated)
      invalidate()
      toast.success('Rescheduled', {
        description: `Now on ${formatDateTime(updated.scheduled_at)}`,
      })
    },
    onError: (error: Error) =>
      toast.error('Could not reschedule', { description: error.message }),
  })

  const book = useMutation({
    mutationFn: createAppointment,
    onSuccess: (created) => {
      invalidate()
      toast.success('Appointment booked', {
        description: formatDateTime(created.scheduled_at),
      })
    },
    onError: (error: Error) => toast.error('Could not book', { description: error.message }),
  })

  return { setStatus, reschedule, book }
}

/** Exposed so the consult screen can announce a follow-up date to the agent. */
export async function notifyFollowUp(
  appointment: AppointmentWithPatient,
  followUpDate: string | null,
) {
  if (!followUpDate) return
  await tellAgent('follow_up_set', appointment, { follow_up_date: followUpDate })
}
