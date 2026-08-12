import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getClinicSettings, saveClinicSettings } from '@/api/settings'
import type { ClinicSettings } from '@/lib/types'
import { qk } from './queryKeys'

export function useClinicSettings() {
  return useQuery({
    queryKey: qk.settings(),
    queryFn: getClinicSettings,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<ClinicSettings>) => saveClinicSettings(patch),
    onSuccess: (data) => {
      client.setQueryData(qk.settings(), data)
      toast.success('Settings saved')
    },
    onError: (error: Error) => toast.error('Could not save settings', { description: error.message }),
  })
}
