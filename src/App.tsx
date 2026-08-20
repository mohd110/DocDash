import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { RealtimeProvider } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { useDoctorProfile } from '@/hooks/useDoctor'
import { isProfileComplete } from '@/api/doctor'
import { isSupabaseConfigured } from '@/lib/supabase'
import { LoginPage } from '@/pages/login'
import { SignupPage } from '@/pages/signup'
import { OnboardingPage } from '@/pages/onboarding'
import { DashboardPage } from '@/pages/dashboard'
import { AppointmentsPage } from '@/pages/appointments'
import { ConsultPage } from '@/pages/consult'
import { PatientsPage } from '@/pages/patients'
import { PatientProfilePage } from '@/pages/patient-profile'
import { PrescriptionPage } from '@/pages/prescription'
import { SettingsPage } from '@/pages/settings'
import { SetupRequiredPage } from '@/pages/setup-required'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-brand-500" />
    </div>
  )
}

/**
 * Everything behind the login wall lives inside the app shell — but only once
 * the doctor's tenant profile exists, since every screen prints their name and
 * every row written from here is stamped with their id.
 */
function ProtectedArea() {
  const { session, loading } = useAuth()
  const { data: doctor, isLoading: loadingProfile, isError, refetch } = useDoctorProfile()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (loadingProfile) return <FullScreenLoader />

  // A failed read is not the same as "no profile yet" — sending a set-up doctor
  // to onboarding over a dropped connection would invite them to overwrite it.
  if (isError) return <ProfileUnavailable onRetry={() => void refetch()} />
  if (!isProfileComplete(doctor)) return <OnboardingPage />

  return (
    <RealtimeProvider>
      <AppShell />
    </RealtimeProvider>
  )
}

function ProfileUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold text-brand-800">
          Could not load your profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your connection — your data is safe.
        </p>
        <Button className="mt-6" size="lg" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequiredPage />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedArea />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/consult/:id" element={<ConsultPage />} />
        <Route path="/prescription/:appointmentId" element={<PrescriptionPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
