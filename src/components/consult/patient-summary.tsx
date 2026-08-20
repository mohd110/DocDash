import * as React from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, Check, Pencil, Phone, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useSavePatient } from '@/hooks/usePatients'
import { describePatient, initials, isBlank } from '@/lib/utils'
import type { Patient } from '@/lib/types'

/** Click-to-edit field used for allergies and chronic conditions (§3.3). */
function InlineEditable({
  label,
  icon,
  value,
  placeholder,
  tone,
  onSave,
  saving,
}: {
  label: string
  icon: React.ReactNode
  value: string | null
  placeholder: string
  tone: 'warn' | 'plain'
  onSave: (next: string) => unknown | Promise<unknown>
  saving: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value ?? '')

  React.useEffect(() => {
    if (!editing) setDraft(value ?? '')
  }, [value, editing])

  const filled = !isBlank(value)
  const box =
    tone === 'warn' && filled
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : 'border-surface-500/50 bg-surface-100/70 text-brand-800'

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${box}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wider">
          {icon}
          {label}
        </span>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 h-8 px-2"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="min-h-[76px] text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={saving}
              onClick={async () => {
                try {
                  await onSave(draft.trim())
                  setEditing(false)
                } catch {
                  // Toasted upstream; stay in edit mode so the text is not lost.
                }
              }}
            >
              <Check />
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              <X />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 whitespace-pre-wrap text-sm">
          {filled ? value : <span className="text-muted-foreground">{placeholder}</span>}
        </p>
      )}
    </div>
  )
}

export function PatientSummary({
  patient,
  reason,
}: {
  patient: Patient
  reason?: string | null
}) {
  const { update } = useSavePatient()

  return (
    <div className="rounded-2xl border border-surface-500/40 bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 font-display text-lg font-semibold text-brand-700">
          {initials(patient.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl font-semibold text-brand-800">
            {patient.full_name}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="size-3.5" />
            {describePatient(patient.age, patient.gender)}
          </p>
          <a
            href={`tel:${patient.phone}`}
            className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
          >
            <Phone className="size-3.5" />
            {patient.phone}
          </a>
        </div>
      </div>

      {reason && (
        <div className="mt-4 rounded-xl border-l-4 border-l-brand-400 bg-surface-200/70 px-3.5 py-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-brand-600">
            Reason for visit
          </p>
          <p className="mt-1 text-[0.95rem] leading-relaxed text-brand-800">{reason}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <InlineEditable
          label="Allergies"
          icon={<AlertTriangle className="size-3.5" />}
          tone="warn"
          value={patient.allergies}
          placeholder="None recorded"
          saving={update.isPending}
          onSave={(next) =>
            update.mutateAsync({ id: patient.id, patch: { allergies: next || null } })
          }
        />
        <InlineEditable
          label="Chronic conditions"
          icon={<Activity className="size-3.5" />}
          tone="plain"
          value={patient.chronic_conditions}
          placeholder="None recorded"
          saving={update.isPending}
          onSave={(next) =>
            update.mutateAsync({ id: patient.id, patch: { chronic_conditions: next || null } })
          }
        />
      </div>

      <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
        <Link to={`/patients/${patient.id}`}>Open full patient profile</Link>
      </Button>
    </div>
  )
}
