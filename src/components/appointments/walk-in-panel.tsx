import * as React from 'react'
import { CalendarClock, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAppointmentDialog, type AppointmentMode } from './new-appointment-dialog'

/**
 * The desk. Patients who turn up without messaging the WhatsApp agent are
 * either seen right now or put on the calendar — both start here (§3.2).
 */
export function WalkInPanel() {
  const [mode, setMode] = React.useState<AppointmentMode | null>(null)

  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl border border-surface-500/40 bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-brand-800">
            Patient at the desk?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Walk-ins never reach the WhatsApp agent — add them here and see them straight away.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
          <Button size="lg" onClick={() => setMode('now')}>
            <Stethoscope />
            Start consultation
          </Button>
          <Button variant="outline" size="lg" onClick={() => setMode('later')}>
            <CalendarClock />
            Book for later
          </Button>
        </div>
      </section>

      <NewAppointmentDialog
        // Remounts per mode so the dialog always opens on the button that was pressed.
        key={mode ?? 'closed'}
        open={mode !== null}
        onOpenChange={(open) => !open && setMode(null)}
        defaultMode={mode ?? 'now'}
      />
    </>
  )
}
