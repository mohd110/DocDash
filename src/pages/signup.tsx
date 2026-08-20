import * as React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Wordmark } from '@/components/layout/logo'
import {
  DoctorDetailsFields,
  EMPTY_DETAILS,
  detailsAreValid,
} from '@/components/auth/doctor-details-fields'
import { useAuth } from '@/hooks/useAuth'
import type { DoctorSignupDetails } from '@/lib/types'

const MIN_PASSWORD = 8

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <ol className="mb-7 flex items-center gap-3" aria-label="Sign-up progress">
      {(
        [
          [1, 'Account'],
          [2, 'Your practice'],
        ] as const
      ).map(([index, label]) => {
        const done = step > index
        const active = step === index
        return (
          <li key={index} className="flex flex-1 items-center gap-2.5">
            <span
              className={
                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
                (done || active
                  ? 'bg-brand-600 text-surface-100'
                  : 'bg-surface-200 text-brand-800/50')
              }
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="size-4" /> : index}
            </span>
            <span
              className={
                'truncate text-sm font-semibold ' +
                (active ? 'text-brand-800' : 'text-muted-foreground')
              }
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Shown when the project has email confirmation switched on. */
function CheckYourInbox({ email }: { email: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-8 text-center">
        <MailCheck className="mx-auto size-12 text-brand-500" />
        <h1 className="font-display text-2xl font-semibold text-brand-800">Confirm your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-semibold">{email}</span>. Open it and
          your dashboard is ready — your practice details are already saved.
        </p>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function SignupPage() {
  const { session, signUp } = useAuth()
  const [step, setStep] = React.useState<1 | 2>(1)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [details, setDetails] = React.useState<DoctorSignupDetails>(EMPTY_DETAILS)
  const [busy, setBusy] = React.useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = React.useState(false)

  if (session) return <Navigate to="/" replace />

  function handleAccountStep(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < MIN_PASSWORD) {
      toast.error(`Password must be at least ${MIN_PASSWORD} characters`)
      return
    }
    if (password !== confirm) {
      toast.error('The two passwords do not match')
      return
    }
    setStep(2)
  }

  async function handleDetailsStep(event: React.FormEvent) {
    event.preventDefault()
    if (!detailsAreValid(details)) {
      toast.error('Your name and degrees are needed', {
        description: 'They print at the top of every prescription.',
      })
      return
    }

    setBusy(true)
    try {
      const { signedIn } = await signUp(email.trim(), password, details)
      if (signedIn) {
        toast.success(`Welcome, ${details.full_name.trim()}`)
        // The session lands via onAuthStateChange, which routes into the app.
      } else {
        setAwaitingConfirmation(true)
      }
    } catch (error) {
      toast.error('Could not create your account', { description: (error as Error).message })
      setStep(1)
    } finally {
      setBusy(false)
    }
  }

  const patchDetails = (patch: Partial<DoctorSignupDetails>) =>
    setDetails((prev) => ({ ...prev, ...patch }))

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className={step === 1 ? 'w-full max-w-md' : 'w-full max-w-2xl'}>
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>

        {awaitingConfirmation ? (
          <CheckYourInbox email={email.trim()} />
        ) : (
          <Card>
            <CardContent className="pt-6 sm:pt-8">
              <Steps step={step} />

              {step === 1 ? (
                <form onSubmit={handleAccountStep} className="space-y-5">
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-brand-800">
                      Create your account
                    </h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Your patients, appointments and prescriptions stay private to this login.
                    </p>
                  </div>

                  <Field label="Email" htmlFor="signup-email">
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@clinic.com"
                    />
                  </Field>

                  <Field
                    label="Password"
                    htmlFor="signup-password"
                    hint={`At least ${MIN_PASSWORD} characters.`}
                  >
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={MIN_PASSWORD}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Field>

                  <Field label="Confirm password" htmlFor="signup-confirm">
                    <Input
                      id="signup-confirm"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Field>

                  <Button type="submit" size="xl" className="w-full">
                    Continue
                    <ArrowRight />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleDetailsStep} className="space-y-6">
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-brand-800">
                      Tell us about your practice
                    </h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      This is the letterhead on every prescription you issue. You can change any of
                      it later in Settings.
                    </p>
                  </div>

                  <DoctorDetailsFields
                    value={details}
                    onChange={patchDetails}
                    idPrefix="signup"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row-reverse">
                    <Button type="submit" size="xl" className="flex-1" loading={busy}>
                      <Check />
                      Create account
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xl"
                      onClick={() => setStep(1)}
                      disabled={busy}
                    >
                      <ArrowLeft />
                      Back
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
