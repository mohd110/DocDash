/** Single source of truth for cache keys, so invalidation is never a guess. */
export const qk = {
  appointments: (scope: string, day?: string) => ['appointments', scope, day ?? null] as const,
  appointmentsRange: (from: string, to: string) => ['appointments', 'range', from, to] as const,
  appointment: (id: string) => ['appointment', id] as const,
  todayStats: () => ['today-stats'] as const,
  patients: (search?: string) => ['patients', search ?? ''] as const,
  patient: (id: string) => ['patient', id] as const,
  patientHistory: (id: string, exclude?: string) =>
    ['patient-history', id, exclude ?? null] as const,
  consultation: (appointmentId: string) => ['consultation', appointmentId] as const,
  medicines: () => ['known-medicines'] as const,
  doctor: () => ['doctor-profile'] as const,
}

/** Everything that must refresh when an appointment changes anywhere. */
export const APPOINTMENT_SCOPED_KEYS = ['appointments', 'appointment', 'today-stats']
