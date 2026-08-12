import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from './logo'
import { NAV_ITEMS } from './nav-items'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { useClinicSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

function LiveDot() {
  const { connected } = useRealtime()
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-cream-500/40 bg-cream-100 px-3 py-1.5"
      title={connected ? 'Live — new bookings appear instantly' : 'Reconnecting to live updates…'}
    >
      <Radio
        className={cn('size-3.5', connected ? 'text-bottle-500' : 'text-stone-400 animate-pulse')}
      />
      <span className="text-xs font-semibold text-bottle-700">
        {connected ? 'Live' : 'Connecting'}
      </span>
    </div>
  )
}

export function AppShell() {
  const { signOut } = useAuth()
  const { data: settings } = useClinicSettings()

  return (
    <div className="min-h-screen lg:flex">
      {/* ----------------------------------------------- desktop sidebar (§7.3) */}
      <aside className="no-print sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-cream-500/40 bg-cream-100/80 px-5 py-7 backdrop-blur lg:flex">
        <Wordmark />

        <nav className="mt-10 flex flex-1 flex-col gap-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-xl px-4 py-4 text-[1.02rem] font-semibold transition-colors',
                  isActive
                    ? 'bg-bottle-600 text-cream-100 shadow-card'
                    : 'text-bottle-800/75 hover:bg-cream-200',
                )
              }
            >
              <Icon className="size-6" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-cream-500/50 pt-5">
          <div className="px-1">
            <p className="truncate font-display text-base font-semibold text-bottle-800">
              {settings?.doctor_name || 'Doctor'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {settings?.clinic_name || 'Hakiman Clinic'}
            </p>
          </div>
          <Button variant="secondary" size="md" className="w-full" onClick={() => void signOut()}>
            <LogOut />
            Sign out
          </Button>
        </div>
      </aside>

      {/* ------------------------------------------------------- main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-cream-500/40 bg-cream-100/95 px-4 py-3 backdrop-blur lg:hidden">
          <Wordmark />
          <div className="flex items-center gap-2">
            <LiveDot />
            <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out">
              <LogOut />
            </Button>
          </div>
        </header>

        {/* Desktop status strip */}
        <div className="no-print hidden justify-end px-8 pt-6 lg:flex">
          <LiveDot />
        </div>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-2">
          <Outlet />
        </main>
      </div>

      {/* --------------------------------------------------- mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-cream-500/50 bg-cream-100/98 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-3 text-[0.7rem] font-semibold transition-colors',
                isActive ? 'text-bottle-600' : 'text-bottle-800/55',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'rounded-lg px-4 py-1 transition-colors',
                    isActive && 'bg-bottle-600 text-cream-100',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
