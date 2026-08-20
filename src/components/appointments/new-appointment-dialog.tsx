import * as React from 'react'
import { CalendarClock, Check, MessageCircle, Search, Stethoscope, UserPlus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useAppointmentActions, useStartWalkIn } from '@/hooks/useAppointments'
import { useDebounced } from '@/hooks/useDebounced'
import { usePatients, useSavePatient } from '@/hooks/usePatients'
import { fromDateTimeInputValue, toDateTimeInputValue } from '@/lib/date'
import { GENDERS } from '@/lib/status'
import { cn, describePatient, initials } from '@/lib/utils'
import type { Patient } from '@/lib/types'

/** Start the consultation this minute, or put the patient on the calendar. */
export type AppointmentMode = 'now' | 'later'

type PatientSource = 'existing' | 'new'

interface NewPatientForm {
  full_name: string
  phone: string
  age: string
  gender: string
}

const EMPTY_PATIENT: NewPatientForm = { full_name: '', phone: '', age: '', gender: '' }

/** The next round half hour, in IST — the sane default for "book for later". */
function nextHalfHour() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30), 0, 0)
  return toDateTimeInputValue(now.toISOString())
}

/** Two-way switch styled like the app's tab bar, but small enough for a dialog. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[]
}) {
  return (
    <div className="inline-flex w-full gap-1 rounded-xl border border-surface-500/40 bg-surface-200/70 p-1.5">
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-[0.9rem] font-semibold transition-all',
              active
                ? 'bg-brand-600 text-surface-100 shadow-card'
                : 'text-brand-700/70 hover:text-brand-800',
            )}
          >
            {Icon && <Icon className="size-4" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function PatientPicker({
  open,
  selected,
  onSelect,
}: {
  open: boolean
  selected: Patient | null
  onSelect: (patient: Patient | null) => void
}) {
  const [search, setSearch] = React.useState('')
  const debounced = useDebounced(search)
  // Only queries while the dialog is open; an empty search lists recent patients.
  const { data: patients, isLoading } = usePatients(debounced, { enabled: open && !selected })

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-brand-600/25 bg-brand-50 p-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display font-semibold text-brand-700">
          {initials(selected.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-brand-800">
            {selected.full_name}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {selected.phone} · {describePatient(selected.age, selected.gender)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect(null)}
          aria-label="Choose a different patient"
        >
          <X />
          Change
        </Button>
      </div>
    )
  }

  const results = (patients ?? []).slice(0, 6)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          // Enter in the search box must not submit the whole dialog.
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          placeholder="Search name or phone"
          className="pl-11"
          aria-label="Search patients"
        />
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto scrollbar-slim">
        {isLoading ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">Loading patients…</p>
        ) : results.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">
            {debounced.trim()
              ? 'No one matches that. Switch to “New patient” to register them.'
              : 'No patients yet — switch to “New patient” to add the first one.'}
          </p>
        ) : (
          results.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => onSelect(patient)}
              className="flex w-full items-center gap-3 rounded-xl border border-surface-500/40 bg-card p-3 text-left transition-colors hover:border-brand-600/40 hover:bg-brand-50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-sm font-semibold text-brand-700">
                {initials(patient.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-brand-800">
                    {patient.full_name}
                  </span>
                  {patient.source === 'whatsapp' && (
                    <Badge tone="green">
                      <MessageCircle className="size-3" />
                      WhatsApp
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {patient.phone} · {describePatient(patient.age, patient.gender)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * The desk-side counterpart to the WhatsApp agent (§3.2): pick or register the
 * patient standing at the desk, then either start the consultation right away
 * or drop them on the calendar for later.
 */
export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultMode = 'now',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: AppointmentMode
}) {
  const { book } = useAppointmentActions()
  const startWalkIn = useStartWalkIn()
  const { create } = useSavePatient()

  const [mode, setMode] = React.useState<AppointmentMode>(defaultMode)
  const [source, setSource] = React.useState<PatientSource>('existing')
  const [selected, setSelected] = React.useState<Patient | null>(null)
  const [form, setForm] = React.useState<NewPatientForm>(EMPTY_PATIENT)
  const [reason, setReason] = React.useState('')
  const [when, setWhen] = React.useState('')

  // Reset every time it reopens, so yesterday's walk-in never leaks into today's.
  React.useEffect(() => {
    if (!open) return
    setMode(defaultMode)
    setSource('existing')
    setSelected(null)
    setForm(EMPTY_PATIENT)
    setReason('')
    setWhen(nextHalfHour())
  }, [open, defaultMode])

  const setField = (patch: Partial<NewPatientForm>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const newPatientReady = form.full_name.trim() !== '' && form.phone.trim() !== ''
  const patientReady = source === 'existing' ? Boolean(selected) : newPatientReady
  const busy = create.isPending || book.isPending || startWalkIn.isPending

  /** Returns the patient to book for, registering them first if they are new. */
  async function resolvePatient(): Promise<Patient> {
    if (source === 'existing') {
      if (!selected) throw new Error('Pick a patient first')
      return selected
    }

    const created = await create.mutateAsync({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      age: form.age.trim() ? Number(form.age) : null,
      gender: form.gender || null,
      source: 'walk_in',
    })

    // Treat them as an existing patient from here on: if the booking itself
    // fails, retrying must not try to create the same record twice.
    setSelected(created)
    setSource('existing')
    return created
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    try {
      const patient = await resolvePatient()

      if (mode === 'now') {
        // The hook navigates to the consult screen on success.
        await startWalkIn.mutateAsync({ patient, reason })
      } else {
        await book.mutateAsync({
          patient_id: patient.id,
          scheduled_at: fromDateTimeInputValue(when),
          reason: reason.trim() || null,
        })
      }

      onOpenChange(false)
    } catch {
      // Every failure is toasted by its mutation; keep the dialog open and
      // filled in so the doctor can correct and retry.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            For a patient who walked in without booking on WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="When">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'now', label: 'Start now', icon: Stethoscope },
                { value: 'later', label: 'Book for later', icon: CalendarClock },
              ]}
            />
          </Field>

          <Field label="Patient">
            <div className="space-y-3">
              <Segmented
                value={source}
                onChange={(next) => {
                  setSource(next)
                  if (next === 'new') setSelected(null)
                }}
                options={[
                  { value: 'existing', label: 'Existing patient', icon: Search },
                  { value: 'new', label: 'New patient', icon: UserPlus },
                ]}
              />

              {source === 'existing' ? (
                <PatientPicker open={open} selected={selected} onSelect={setSelected} />
              ) : (
                <div className="space-y-4 rounded-xl border border-surface-500/40 bg-surface-100/60 p-4">
                  <Field label="Full name" htmlFor="na-name">
                    <Input
                      id="na-name"
                      value={form.full_name}
                      onChange={(e) => setField({ full_name: e.target.value })}
                      placeholder="Ravi Kumar"
                    />
                  </Field>

                  <Field
                    label="Phone (with country code)"
                    htmlFor="na-phone"
                    hint="How the WhatsApp agent sends their prescription — it must be unique."
                  >
                    <Input
                      id="na-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField({ phone: e.target.value })}
                      placeholder="+919876543210"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Age" htmlFor="na-age">
                      <Input
                        id="na-age"
                        type="number"
                        min={0}
                        max={130}
                        value={form.age}
                        onChange={(e) => setField({ age: e.target.value })}
                        placeholder="34"
                      />
                    </Field>

                    <Field label="Gender" htmlFor="na-gender">
                      <Select
                        id="na-gender"
                        value={form.gender}
                        onChange={(e) => setField({ gender: e.target.value })}
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

                  <p className="text-xs text-muted-foreground">
                    Allergies and chronic conditions can be filled in on their profile later.
                  </p>
                </div>
              )}
            </div>
          </Field>

          {mode === 'later' && (
            <Field label="Date & time (IST)" htmlFor="na-when">
              <Input
                id="na-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </Field>
          )}

          <Field label="Reason for visit" htmlFor="na-reason">
            <Input
              id="na-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="fever and cough"
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
            <Button
              type="submit"
              size="lg"
              loading={busy}
              disabled={!patientReady || (mode === 'later' && !when)}
            >
              {mode === 'now' ? (
                <>
                  <Stethoscope />
                  Start consultation
                </>
              ) : (
                <>
                  <Check />
                  Book appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
