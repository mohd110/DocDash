import * as React from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Wordmark } from '@/components/layout/logo'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      toast.success('Welcome back')
    } catch (error) {
      toast.error('Could not sign in', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>

        <Card>
          <CardContent className="pt-6 sm:pt-8">
            <h1 className="font-display text-2xl font-semibold text-bottle-800">Sign in</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You will stay signed in on this device.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>

              <Button type="submit" size="xl" className="w-full" loading={busy}>
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accounts are created by your clinic administrator.
        </p>
      </div>
    </div>
  )
}
