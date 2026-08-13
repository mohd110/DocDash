import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createPatient,
  getPatient,
  getPatientHistory,
  listKnownMedicines,
  listPatients,
  updatePatient,
} from '@/api/patients'
import type { Patient } from '@/lib/types'
import { qk } from './queryKeys'

/** `enabled: false` keeps the list from loading behind a closed dialog. */
export function usePatients(search?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.patients(search),
    queryFn: () => listPatients(search),
    enabled: options?.enabled ?? true,
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: qk.patient(id ?? ''),
    queryFn: () => getPatient(id!),
    enabled: Boolean(id),
  })
}

export function usePatientHistory(patientId: string | undefined, excludeAppointmentId?: string) {
  return useQuery({
    queryKey: qk.patientHistory(patientId ?? '', excludeAppointmentId),
    queryFn: () => getPatientHistory(patientId!, excludeAppointmentId),
    enabled: Boolean(patientId),
  })
}

export function useKnownMedicines() {
  return useQuery({
    queryKey: qk.medicines(),
    queryFn: listKnownMedicines,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSavePatient() {
  const client = useQueryClient()

  const create = useMutation({
    mutationFn: createPatient,
    onSuccess: (patient) => {
      client.invalidateQueries({ queryKey: ['patients'] })
      toast.success(`${patient.full_name} added`)
    },
    onError: (error: Error) =>
      toast.error('Could not add patient', {
        description: error.message.includes('duplicate')
          ? 'A patient with this phone number already exists.'
          : error.message,
      }),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Patient> }) =>
      updatePatient(id, patch),
    onSuccess: (patient) => {
      client.setQueryData(qk.patient(patient.id), patient)
      client.invalidateQueries({ queryKey: ['patients'] })
      client.invalidateQueries({ queryKey: ['appointment'] })
      toast.success('Patient details updated')
    },
    onError: (error: Error) =>
      toast.error('Could not update patient', { description: error.message }),
  })

  return { create, update }
}
