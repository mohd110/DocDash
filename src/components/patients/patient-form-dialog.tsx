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
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { GENDERS } from '@/lib/status'
import { useSavePatient } from '@/hooks/usePatients'
import type { Patient } from '@/lib/types'

interface FormState {
  full_name: string
  phone: string
  age: string
  gender: string
  allergies: string
  chronic_conditions: string
}

function toForm(patient?: Patient | null): FormState {
  return {
    full_name: patient?.full_name ?? '',
    phone: patient?.phone ?? '',
    age: patient?.age != null ? String(patient.age) : '',
    gender: patient?.gender ?? '',
    allergies: patient?.allergies ?? '',
    chronic_conditions: patient?.chronic_conditions ?? '',
  }
}

/** Add a walk-in, or edit an existing record (§3.4). */
export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient?: Patient | null
  onSaved?: (patient: Patient) => void
}) {
  const { create, update } = useSavePatient()
  const [form, setForm] = React.useState<FormState>(() => toForm(patient))
  const editing = Boolean(patient)

  React.useEffect(() => {
    if (open) setForm(toForm(patient))
  }, [open, patient])

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      age: form.age.trim() ? Number(form.age) : null,
      gender: form.gender || null,
      allergies: form.allergies.trim() || null,
      chronic_conditions: form.chronic_conditions.trim() || null,
    }

    try {
      const saved = patient
        ? await update.mutateAsync({ id: patient.id, patch: payload })
        : await create.mutateAsync({ ...payload, source: 'walk_in' })

      onSaved?.(saved)
      onOpenChange(false)
    } catch {
      // Already toasted (e.g. duplicate phone) — keep the form open and filled
      // in so the doctor can correct it instead of retyping everything.
    }
  }

  const busy = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit patient' : 'Add patient'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the details on file for this patient.'
              : 'For walk-ins who did not book through WhatsApp.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name" htmlFor="pf-name">
            <Input
              id="pf-name"
              required
              value={form.full_name}
              onChange={(e) => set({ full_name: e.target.value })}
              placeholder="Ravi Kumar"
            />
          </Field>

          <Field
            label="Phone (with country code)"
            htmlFor="pf-phone"
            hint="This is how the WhatsApp agent reaches them — it must be unique."
          >
            <Input
              id="pf-phone"
              required
              type="tel"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+919876543210"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Age" htmlFor="pf-age">
              <Input
                id="pf-age"
                type="number"
                min={0}
                max={130}
                value={form.age}
                onChange={(e) => set({ age: e.target.value })}
                placeholder="34"
              />
            </Field>

            <Field label="Gender" htmlFor="pf-gender">
              <Select
                id="pf-gender"
                value={form.gender}
                onChange={(e) => set({ gender: e.target.value })}
              >
                <option value="">Not specified</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Allergies" htmlFor="pf-allergies">
            <Textarea
              id="pf-allergies"
              value={form.allergies}
              onChange={(e) => set({ allergies: e.target.value })}
              placeholder="Penicillin, dust…"
              className="min-h-[80px]"
            />
          </Field>

          <Field label="Chronic conditions" htmlFor="pf-conditions">
            <Textarea
              id="pf-conditions"
              value={form.chronic_conditions}
              onChange={(e) => set({ chronic_conditions: e.target.value })}
              placeholder="Diabetes type 2, hypertension…"
              className="min-h-[80px]"
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" loading={busy}>
              {editing ? 'Save changes' : 'Add patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
