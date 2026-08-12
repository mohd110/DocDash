import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { fromDateTimeInputValue, toDateTimeInputValue } from '@/lib/date'
import type { AppointmentWithPatient } from '@/lib/types'

export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  appointment: AppointmentWithPatient
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (scheduledAtIso: string) => void
  busy?: boolean
}) {
  const [value, setValue] = React.useState(() => toDateTimeInputValue(appointment.scheduled_at))

  // Reset to the appointment's current slot each time the dialog re-opens.
  React.useEffect(() => {
    if (open) setValue(toDateTimeInputValue(appointment.scheduled_at))
  }, [open, appointment.scheduled_at])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            {appointment.patient?.full_name} will be informed on WhatsApp by the booking agent.
          </DialogDescription>
        </DialogHeader>

        <Field label="New date & time (IST)" htmlFor="reschedule-at">
          <Input
            id="reschedule-at"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>

        <DialogFooter>
          <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button
            size="lg"
            loading={busy}
            disabled={!value}
            onClick={() => onConfirm(fromDateTimeInputValue(value))}
          >
            Save new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
