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
import { useAppointmentActions } from '@/hooks/useAppointments'
import { fromDateTimeInputValue, toDateTimeInputValue } from '@/lib/date'
import type { Patient } from '@/lib/types'

/** Books a slot for a walk-in the WhatsApp agent never saw. */
export function BookAppointmentDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { book } = useAppointmentActions()
  const [when, setWhen] = React.useState('')
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (open) {
      // Default to the next round half hour, in IST.
      const now = new Date()
      now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30), 0, 0)
      setWhen(toDateTimeInputValue(now.toISOString()))
      setReason('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>For {patient.full_name}, added at the desk.</DialogDescription>
        </DialogHeader>

        <Field label="Date & time (IST)" htmlFor="ba-when">
          <Input
            id="ba-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>

        <Field label="Reason for visit" htmlFor="ba-reason">
          <Input
            id="ba-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="fever and cough"
          />
        </Field>

        <DialogFooter>
          <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="lg"
            disabled={!when}
            loading={book.isPending}
            onClick={async () => {
              try {
                await book.mutateAsync({
                  patient_id: patient.id,
                  scheduled_at: fromDateTimeInputValue(when),
                  reason: reason.trim() || null,
                })
                onOpenChange(false)
              } catch {
                // Toasted upstream; keep the dialog open to retry.
              }
            }}
          >
            Book appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
