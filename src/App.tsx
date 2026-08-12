import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { RealtimeProvider } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { AppointmentsPage } from '@/pages/appointments'
import { ConsultPage } from '@/pages/consult'
import { PatientsPage } from '@/pages/patients'
import { PatientProfilePage } from '@/pages/patient-profile'
import { SettingsPage } from '@/pages/settings'
import { SetupRequiredPage } from '@/pages/setup-required'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-bottle-500" />
    </div>
  )
}

/** Everything behind the login wall lives inside the app shell. */
function ProtectedArea() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return (
    <RealtimeProvider>
      <AppShell />
    </RealtimeProvider>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequiredPage />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedArea />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/consult/:id" element={<ConsultPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
