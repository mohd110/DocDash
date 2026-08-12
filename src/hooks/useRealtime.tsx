import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { APPOINTMENT_SCOPED_KEYS } from './queryKeys'

interface RealtimeContextValue {
  /** Appointment ids that arrived in the last few seconds — used for the pop-in flash. */
  freshIds: Set<string>
  connected: boolean
}

const RealtimeContext = React.createContext<RealtimeContextValue>({
  freshIds: new Set(),
  connected: false,
})

const FLASH_MS = 6000

/**
 * One Supabase Realtime subscription for the whole app (§3.1). New WhatsApp
 * bookings land in the cache without a refresh and briefly highlight themselves.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient()
  const [freshIds, setFreshIds] = React.useState<Set<string>>(new Set())
  const [connected, setConnected] = React.useState(false)

  React.useEffect(() => {
    if (!isSupabaseConfigured) return

    const refresh = () => {
      for (const key of APPOINTMENT_SCOPED_KEYS) {
        client.invalidateQueries({ queryKey: [key] })
      }
    }

    const channel = supabase
      .channel('hakiman-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          const id = (payload.new as { id?: string })?.id
          if (id) {
            setFreshIds((prev) => new Set(prev).add(id))
            window.setTimeout(() => {
              setFreshIds((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
            }, FLASH_MS)
          }
          refresh()
          toast.success('New booking from WhatsApp', {
            description: 'It has been added to the list.',
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'appointments' },
        refresh,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () =>
        client.invalidateQueries({ queryKey: ['patients'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, refresh)
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    return () => {
      supabase.removeChannel(channel)
    }
  }, [client])

  const value = React.useMemo(() => ({ freshIds, connected }), [freshIds, connected])

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return React.useContext(RealtimeContext)
}
