import * as React from 'react'
import { CalendarDays, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { ListSkeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppointmentCard } from '@/components/appointments/appointment-card'
import { useAppointments } from '@/hooks/useAppointments'
import type { AppointmentScope } from '@/api/appointments'
import { formatDate } from '@/lib/date'
import type { AppointmentWithPatient } from '@/lib/types'

/** Name or phone, case-insensitive — the two things the doctor remembers. */
function matches(appointment: AppointmentWithPatient, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const patient = appointment.patient
  return (
    (patient?.full_name ?? '').toLowerCase().includes(q) ||
    (patient?.phone ?? '').toLowerCase().includes(q) ||
    (appointment.reason ?? '').toLowerCase().includes(q)
  )
}

const EMPTY_COPY: Record<AppointmentScope, { emoji: string; title: string; description: string }> = {
  today: {
    emoji: '🎉',
    title: 'No appointments today 🎉',
    description: 'Enjoy the quiet. New WhatsApp bookings appear here instantly.',
  },
  upcoming: {
    emoji: '🗓️',
    title: 'Nothing booked yet',
    description: 'Future appointments made by the WhatsApp agent will show up here.',
  },
  past: {
    emoji: '📁',
    title: 'No past appointments',
    description: 'Completed and closed visits from the last 60 days appear here.',
  },
}

function ScopePanel({
  scope,
  search,
  day,
}: {
  scope: AppointmentScope
  search: string
  day?: string
}) {
  const { data, isLoading } = useAppointments(scope, day)
  const filtered = (data ?? []).filter((a) => matches(a, search))

  if (isLoading) return <ListSkeleton rows={4} />

  if (filtered.length === 0) {
    if (search.trim() || day) {
      return (
        <EmptyState
          emoji="🔍"
          title="No matching appointments"
          description={
            day
              ? `Nothing found for ${formatDate(`${day}T00:00:00+05:30`)}${search ? ' with that search' : ''}.`
              : 'Try a different name or phone number.'
          }
        />
      )
    }
    return <EmptyState {...EMPTY_COPY[scope]} />
  }

  return (
    <div className="space-y-3">
      {filtered.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} showDate={scope !== 'today'} />
      ))}
    </div>
  )
}

export function AppointmentsPage() {
  const [tab, setTab] = React.useState<AppointmentScope>('today')
  const [search, setSearch] = React.useState('')
  const [day, setDay] = React.useState('')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-bottle-800 sm:text-4xl">
          Appointments
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything the WhatsApp agent has booked, in one list.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as AppointmentScope)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger value="today" className="flex-1 lg:flex-none">
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 lg:flex-none">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 lg:flex-none">
              Past
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or phone"
                className="w-full pl-11 sm:w-72"
                aria-label="Search appointments"
              />
            </div>

            {/* Date picker applies to the Past tab (§3.2) */}
            {tab === 'past' && (
              <div className="relative flex items-center gap-2">
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="pl-11"
                  aria-label="Pick a date"
                />
                {day && (
                  <Button variant="ghost" size="icon" onClick={() => setDay('')} aria-label="Clear date">
                    <X />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <TabsContent value="today">
          <ScopePanel scope="today" search={search} />
        </TabsContent>
        <TabsContent value="upcoming">
          <ScopePanel scope="upcoming" search={search} />
        </TabsContent>
        <TabsContent value="past">
          <ScopePanel scope="past" search={search} day={day || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
