import { GripVertical, Pill, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DURATION_PRESETS, FREQUENCY_PRESETS, INSTRUCTION_PRESETS } from '@/lib/status'
import type { MedicineDraft } from '@/lib/types'

export function emptyMedicine(): MedicineDraft {
  return {
    key: crypto.randomUUID(),
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  }
}

/**
 * Repeatable prescription rows (§3.3). Every field is a datalist-backed input:
 * the presets drop down like a menu, but anything can still be typed.
 */
export function MedicineRows({
  value,
  onChange,
  suggestions,
}: {
  value: MedicineDraft[]
  onChange: (next: MedicineDraft[]) => void
  suggestions: string[]
}) {
  function update(key: string, patch: Partial<MedicineDraft>) {
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function remove(key: string) {
    const next = value.filter((row) => row.key !== key)
    onChange(next.length > 0 ? next : [emptyMedicine()])
  }

  return (
    <div className="space-y-3">
      {/* Shared option lists — rendered once, referenced by every row */}
      <datalist id="dl-medicines">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="dl-frequency">
        {FREQUENCY_PRESETS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <datalist id="dl-duration">
        {DURATION_PRESETS.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="dl-instructions">
        {INSTRUCTION_PRESETS.map((i) => (
          <option key={i} value={i} />
        ))}
      </datalist>

      {value.map((row, index) => (
        <div
          key={row.key}
          className="rounded-xl border border-cream-500/50 bg-cream-100/60 p-3 sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-bottle-600">
              <GripVertical className="size-4 opacity-40" />
              Medicine {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-red-50"
              onClick={() => remove(row.key)}
              aria-label={`Remove medicine ${index + 1}`}
            >
              <Trash2 />
              Remove
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5 xl:col-span-2">
              <Label htmlFor={`med-name-${row.key}`} className="text-xs">
                Medicine
              </Label>
              <Input
                id={`med-name-${row.key}`}
                list="dl-medicines"
                autoComplete="off"
                value={row.medicine_name}
                onChange={(e) => update(row.key, { medicine_name: e.target.value })}
                placeholder="e.g. Paracetamol 500mg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`med-dose-${row.key}`} className="text-xs">
                Dosage
              </Label>
              <Input
                id={`med-dose-${row.key}`}
                value={row.dosage}
                onChange={(e) => update(row.key, { dosage: e.target.value })}
                placeholder="1 tablet"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`med-freq-${row.key}`} className="text-xs">
                Frequency
              </Label>
              <Input
                id={`med-freq-${row.key}`}
                list="dl-frequency"
                autoComplete="off"
                value={row.frequency}
                onChange={(e) => update(row.key, { frequency: e.target.value })}
                placeholder="1-0-1"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`med-dur-${row.key}`} className="text-xs">
                Duration
              </Label>
              <Input
                id={`med-dur-${row.key}`}
                list="dl-duration"
                autoComplete="off"
                value={row.duration}
                onChange={(e) => update(row.key, { duration: e.target.value })}
                placeholder="5 days"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`med-instr-${row.key}`} className="text-xs">
                Instructions
              </Label>
              <Input
                id={`med-instr-${row.key}`}
                list="dl-instructions"
                autoComplete="off"
                value={row.instructions}
                onChange={(e) => update(row.key, { instructions: e.target.value })}
                placeholder="After food"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full border-dashed"
        onClick={() => onChange([...value, emptyMedicine()])}
      >
        <Plus />
        Add another medicine
        <Pill className="opacity-50" />
      </Button>
    </div>
  )
}
