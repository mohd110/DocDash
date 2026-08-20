import * as React from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { AppointmentCard } from './appointment-card'
import { useAppointmentsBetween } from '@/hooks/useAppointments'
import {
  formatDate,
  formatTime,
  monthLabel,
  monthMatrix,
  toDateInputValue,
  todayInIST,
} from '@/lib/date'
import { STATUS_META } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { AppointmentWithPatient } from '@/lib/types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Statuses that still count as "booked time" in the day totals. */
function isLive(a: AppointmentWithPatient) {
  return a.status !== 'cancelled' && a.status !== 'no_show'
}

export function AppointmentCalendar() {
  const today = todayInIST()
  const [year, setYear] = React.useState(() => Number(today.slice(0, 4)))
  const [monthIndex, setMonthIndex] = React.useState(() => Number(today.slice(5, 7)) - 1)
  const [selected, setSelected] = React.useState<string>(today)

  const cells = React.useMemo(() => monthMatrix(year, monthIndex), [year, monthIndex])
  const { data, isLoading } = useAppointmentsBetween(cells[0].iso, cells[cells.length - 1].iso)

  /** appointments bucketed by their IST calendar day */
  const byDay = React.useMemo(() => {
    const map = new Map<string, AppointmentWithPatient[]>()
    for (const appointment of data ?? []) {
      const key = toDateInputValue(appointment.scheduled_at)
      const list = map.get(key)
      if (list) list.push(appointment)
      else map.set(key, [appointment])
    }
    return map
  }, [data])

  function step(delta: number) {
    const next = monthIndex + delta
    if (next < 0) {
      setMonthIndex(11)
      setYear((y) => y - 1)
    } else if (next > 11) {
      setMonthIndex(0)
      setYear((y) => y + 1)
    } else {
      setMonthIndex(next)
    }
  }

  function goToToday() {
    setYear(Number(today.slice(0, 4)))
    setMonthIndex(Number(today.slice(5, 7)) - 1)
    setSelected(today)
  }

  const selectedList = byDay.get(selected) ?? []

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------ month header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-brand-800">
          {monthLabel(year, monthIndex)}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="md" onClick={goToToday}>
            <CalendarDays />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* -------------------------------------------------------- month grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 gap-1.5 pb-1.5">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[0.7rem] font-bold uppercase tracking-wider text-brand-600"
              >
                {day}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 42 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell) => {
                const list = byDay.get(cell.iso) ?? []
                const live = list.filter(isLive)
                const isToday = cell.iso === today
                const isSelected = cell.iso === selected

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelected(cell.iso)}
                    aria-label={`${formatDate(`${cell.iso}T00:00:00+05:30`)}, ${live.length} appointments`}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex h-24 flex-col gap-1 rounded-xl border p-1.5 text-left transition-colors',
                      cell.inMonth
                        ? 'border-surface-500/50 bg-card hover:bg-surface-100'
                        : 'border-transparent bg-surface-100/40 text-muted-foreground/60',
                      isToday && 'border-brand-400 bg-brand-50',
                      isSelected && 'ring-2 ring-brand-500 ring-offset-1 ring-offset-background',
                    )}
                  >
                    <span className="flex items-center justify-between px-0.5">
                      <span
                        className={cn(
                          'text-sm font-bold',
                          isToday ? 'text-brand-700' : 'text-brand-800/80',
                          !cell.inMonth && 'font-medium text-muted-foreground/60',
                        )}
                      >
                        {cell.dayOfMonth}
                      </span>
                      {live.length > 0 && (
                        <span className="rounded-full bg-brand-600 px-1.5 text-[0.65rem] font-bold text-surface-100">
                          {live.length}
                        </span>
                      )}
                    </span>

                    <span className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {list.slice(0, 2).map((appointment) => (
                        <span
                          key={appointment.id}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[0.65rem] text-brand-800"
                          title={`${formatTime(appointment.scheduled_at)} — ${appointment.patient?.full_name ?? ''}`}
                        >
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              STATUS_META[appointment.status].dot,
                            )}
                          />
                          <span className="truncate">
                            {formatTime(appointment.scheduled_at).replace(':00', '')}{' '}
                            {appointment.patient?.full_name?.split(' ')[0]}
                          </span>
                        </span>
                      ))}
                      {list.length > 2 && (
                        <span className="px-1 text-[0.62rem] font-semibold text-muted-foreground">
                          +{list.length - 2} more
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-surface-500/40 bg-surface-100/60 px-4 py-2.5">
        {(['booked', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
          <span key={status} className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
            <span className={cn('size-2 rounded-full', STATUS_META[status].dot)} />
            {STATUS_META[status].label}
          </span>
        ))}
      </div>

      {/* -------------------------------------------------- selected day list */}
      <section className="space-y-3">
        <h3 className="font-display text-xl font-semibold text-brand-800">
          {selected === today ? 'Today' : formatDate(`${selected}T00:00:00+05:30`)}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            ({selectedList.length} {selectedList.length === 1 ? 'appointment' : 'appointments'})
          </span>
        </h3>

        {selectedList.length === 0 ? (
          <EmptyState
            emoji="🗓️"
            title="Nothing booked on this day"
            description="Pick another date, or wait for the WhatsApp agent to fill it in."
          />
        ) : (
          selectedList.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} showDate />
          ))
        )}
      </section>
    </div>
  )
}
