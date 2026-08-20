import * as React from 'react'
import { toast } from 'sonner'
import { Check, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wordmark } from '@/components/layout/logo'
import {
  DoctorDetailsFields,
  EMPTY_DETAILS,
  detailsAreValid,
} from '@/components/auth/doctor-details-fields'
import { useAuth } from '@/hooks/useAuth'
import { useSaveDoctorProfile } from '@/hooks/useDoctor'
import type { DoctorProfile, DoctorSignupDetails } from '@/lib/types'

/** The signup answers, shaped for the doctors table. */
export function detailsToProfile(details: DoctorSignupDetails): Partial<DoctorProfile> {
  const text = (value: string) => value.trim() || null
  const years = Number.parseInt(details.years_experience, 10)

  return {
    full_name: details.full_name.trim(),
    qualifications: text(details.qualifications),
    specialization: text(details.specialization),
    registration_no: text(details.registration_no),
    years_experience: Number.isFinite(years) ? years : null,
    phone: text(details.phone),
    clinic_name: text(details.clinic_name),
    address: text(details.address),
    working_hours: text(details.working_hours),
  }
}

/**
 * The safety net for a signed-in account with no profile row: an invite created
 * straight in Supabase, or a doctor who signed up before this screen existed.
 * Asks exactly the same questions the sign-up form does.
 */
export function OnboardingPage() {
  const { session, signOut } = useAuth()
  const save = useSaveDoctorProfile()
  const [details, setDetails] = React.useState<DoctorSignupDetails>(EMPTY_DETAILS)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!detailsAreValid(details)) {
      toast.error('Your name and degrees are needed', {
        description: 'They print at the top of every prescription.',
      })
      return
    }
    save.mutate({ ...detailsToProfile(details), email: session?.user.email ?? null })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>

        <Card>
          <CardContent className="pt-6 sm:pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold text-brand-800">
                  Finish setting up your practice
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Signed in as {session?.user.email}. A few details and your dashboard is ready —
                  all of it is editable later in Settings.
                </p>
              </div>

              <DoctorDetailsFields
                value={details}
                onChange={(patch) => setDetails((prev) => ({ ...prev, ...patch }))}
                idPrefix="onboarding"
              />

              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <Button type="submit" size="xl" className="flex-1" loading={save.isPending}>
                  <Check />
                  Open my dashboard
                </Button>
                <Button type="button" variant="ghost" size="xl" onClick={() => void signOut()}>
                  <LogOut />
                  Sign out
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
