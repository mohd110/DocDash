import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { DoctorSignupDetails } from '@/lib/types'

export interface SignUpResult {
  /** False when the project requires email confirmation before the first sign-in. */
  signedIn: boolean
}

interface AuthContextValue {
  session: Session | null
  /** The tenant id — every row this doctor can see is keyed to it. */
  doctorId: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    details: DoctorSignupDetails,
  ) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)
  const queryClient = useQueryClient()

  React.useEffect(() => {
    let active = true
    // Which tenant the cache currently holds. Token refreshes re-fire
    // SIGNED_IN, so the id — not the event — decides when it must be dropped.
    let cachedFor: string | null = null

    // Session is persisted in localStorage, so a returning doctor is already in.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      cachedFor = data.session?.user.id ?? null
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      const nextId = next?.user.id ?? null
      // On a shared computer the next doctor to sign in must never be served
      // the previous one's cached patients.
      if (nextId !== cachedFor) {
        cachedFor = nextId
        queryClient.clear()
      }
      setSession(next)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [queryClient])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      doctorId: session?.user.id ?? null,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(email, password, details) {
        // The answers travel as user metadata; a Postgres trigger on
        // auth.users turns them into the doctor's profile row, which works
        // even when the account is still awaiting email confirmation.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { ...details, email } },
        })
        if (error) throw error
        return { signedIn: Boolean(data.session) }
      },
      async signOut() {
        // Clear the local session even if the network call fails, otherwise the
        // Sign out button appears to do nothing when offline.
        try {
          await supabase.auth.signOut()
        } catch {
          setSession(null)
        }
        queryClient.clear()
      },
    }),
    [session, loading, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
