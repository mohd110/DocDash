import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDoctorProfile, saveDoctorProfile } from '@/api/doctor'
import type { DoctorProfile } from '@/lib/types'
import { qk } from './queryKeys'

/** The signed-in doctor's own tenant profile. `null` until they finish onboarding. */
export function useDoctorProfile() {
  return useQuery({
    queryKey: qk.doctor(),
    queryFn: getDoctorProfile,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveDoctorProfile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<DoctorProfile>) => saveDoctorProfile(patch),
    onSuccess: (data) => {
      client.setQueryData(qk.doctor(), data)
      toast.success('Profile saved')
    },
    onError: (error: Error) =>
      toast.error('Could not save your profile', { description: error.message }),
  })
}
