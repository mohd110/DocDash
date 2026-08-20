import * as React from 'react'
import { Check, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  applyTheme,
  buildThemeVars,
  describeAdjustment,
  isValidHex,
  THEME_PRESETS,
  type ThemeColors,
} from '@/lib/theme'

/** Two dots on a card of the surface colour — enough to judge a pairing. */
function PresetSwatch({ theme }: { theme: ThemeColors }) {
  const vars = buildThemeVars(theme)
  return (
    <div
      className="flex h-11 w-full items-center gap-1.5 rounded-lg px-2.5"
      style={{ backgroundColor: `hsl(${vars['--surface-100']})` }}
    >
      <span
        className="size-6 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(${vars['--brand-600']})` }}
      />
      <span
        className="size-4 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(${vars['--brand-400']})` }}
      />
      <span
        className="h-2 flex-1 rounded-full"
        style={{ backgroundColor: `hsl(${vars['--surface-300']})` }}
      />
    </div>
  )
}

/**
 * A live miniature of the dashboard in the chosen colours. It is themed by
 * writing the CSS variables onto this element instead of the document root, so
 * the preview can show an unsaved theme while the rest of the page stays put.
 */
function ThemePreview({ theme }: { theme: ThemeColors }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (ref.current) applyTheme(theme, ref.current)
  }, [theme])

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border-2 border-surface-500/40 bg-surface-100"
    >
      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-28 shrink-0 flex-col gap-1.5 border-r border-surface-500/40 bg-surface-100 p-2.5 sm:flex">
          <div className="h-2.5 w-16 rounded-full bg-brand-800/70" />
          <div className="mt-2 rounded-md bg-brand-600 px-2 py-1.5">
            <div className="h-1.5 w-12 rounded-full bg-surface-100/90" />
          </div>
          <div className="rounded-md px-2 py-1.5">
            <div className="h-1.5 w-14 rounded-full bg-brand-800/30" />
          </div>
          <div className="rounded-md px-2 py-1.5">
            <div className="h-1.5 w-10 rounded-full bg-brand-800/30" />
          </div>
        </div>

        {/* content */}
        <div className="min-w-0 flex-1 space-y-2.5 p-3">
          <div className="h-3 w-32 rounded-full bg-brand-800/80" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg bg-card p-2 shadow-card">
                <div className="h-1.5 w-8 rounded-full bg-brand-800/25" />
                <div className="mt-1.5 h-3 w-5 rounded-full bg-brand-600" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-card p-2.5 shadow-card">
            <div className="size-6 rounded-full bg-brand-100" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 w-20 rounded-full bg-brand-800/60" />
              <div className="h-1.5 w-12 rounded-full bg-brand-800/25" />
            </div>
            <div className="h-5 w-12 rounded-md bg-brand-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Colour swatch + hex box, kept in step with each other. */
function ColorField({
  label,
  hint,
  id,
  value,
  onChange,
}: {
  label: string
  hint: string
  id: string
  value: string
  onChange: (hex: string) => void
}) {
  const valid = isValidHex(value)

  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-3">
        <label
          className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-surface-500/50 shadow-sm"
          style={{ backgroundColor: valid ? value : undefined }}
          aria-label={`${label} colour picker`}
        >
          <input
            type="color"
            className="absolute -left-2 -top-2 size-20 cursor-pointer opacity-0"
            value={valid ? value : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
          />
        </label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="#0B5540"
          spellCheck={false}
          className={cn('font-mono uppercase', !valid && 'border-destructive/60')}
          aria-invalid={!valid}
        />
      </div>
    </Field>
  )
}

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeColors
  onChange: (theme: ThemeColors) => void
}) {
  // An in-progress hex ("#0B5") must not repaint the preview mid-typing.
  const safe: ThemeColors = {
    primary: isValidHex(value.primary) ? value.primary : '#0B5540',
    background: isValidHex(value.background) ? value.background : '#FDF8EC',
  }

  const adjustment = describeAdjustment(safe)

  const matchesPreset = (preset: ThemeColors) =>
    preset.primary.toUpperCase() === value.primary.toUpperCase() &&
    preset.background.toUpperCase() === value.background.toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-brand-700/80">
          Presets
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const active = matchesPreset(preset)
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChange({ primary: preset.primary, background: preset.background })}
                aria-pressed={active}
                className={cn(
                  'group rounded-xl border-2 p-2 text-left transition-all',
                  active
                    ? 'border-brand-600 shadow-card'
                    : 'border-surface-500/40 hover:border-brand-400',
                )}
              >
                <PresetSwatch theme={preset} />
                <span className="mt-1.5 flex items-center gap-1 px-0.5 text-xs font-semibold text-brand-800">
                  {active && <Check className="size-3.5 shrink-0" />}
                  <span className="truncate">{preset.name}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <ColorField
          id="theme_primary"
          label="Brand colour"
          hint="Buttons, headings, the active menu item."
          value={value.primary}
          onChange={(primary) => onChange({ ...value, primary })}
        />
        <ColorField
          id="theme_background"
          label="Background colour"
          hint="The paper behind everything. Light tints work best — a dark pick is lightened."
          value={value.background}
          onChange={(background) => onChange({ ...value, background })}
        />
      </div>

      <div>
        <p className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-brand-700/80">
          Preview
        </p>
        <ThemePreview theme={safe} />
        {adjustment && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-brand-700">
            <Info className="mt-px size-3.5 shrink-0" />
            {adjustment}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          The full range of shades is generated from these two colours. Save to apply it across the
          dashboard and your prescriptions.
        </p>
      </div>
    </div>
  )
}
