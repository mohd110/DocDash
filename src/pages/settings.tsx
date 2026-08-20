import * as React from 'react'
import { toast } from 'sonner'
import {
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Link2,
  Palette,
  Plug,
  Stethoscope,
  Upload,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { uploadDoctorAsset } from '@/api/doctor'
import { useDoctorProfile, useSaveDoctorProfile } from '@/hooks/useDoctor'
import { ThemePicker } from '@/components/settings/theme-picker'
import { themeFrom, type ThemeColors } from '@/lib/theme'
import type { DoctorProfile } from '@/lib/types'

/** Every editable column, as strings — the form never holds nulls. */
const TEXT_FIELDS = [
  'full_name',
  'qualifications',
  'specialization',
  'registration_no',
  'phone',
  'clinic_name',
  'address',
  'logo_url',
  'signature_url',
  'default_meeting_link',
  'working_hours',
  'n8n_webhook_url',
] as const

type TextField = (typeof TEXT_FIELDS)[number]
type Form = Record<TextField | 'years_experience', string>

function toForm(doctor: DoctorProfile): Form {
  const form = Object.fromEntries(TEXT_FIELDS.map((key) => [key, doctor[key] ?? ''])) as Form
  form.years_experience = doctor.years_experience == null ? '' : String(doctor.years_experience)
  return form
}

function CopyableUrl({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false)

  return (
    <div className="rounded-xl border border-surface-500/50 bg-surface-100/70 p-3">
      <p className="text-[0.68rem] font-bold uppercase tracking-wider text-brand-600">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-card px-2.5 py-1.5 font-mono text-xs text-brand-800">
          {value}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            } catch {
              // Clipboard access can be denied — show the URL so it can be
              // selected by hand rather than failing silently.
              toast.error('Could not copy', { description: value })
            }
          }}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="text-brand-600" /> : <Copy />}
        </Button>
      </div>
    </div>
  )
}

function AssetUpload({
  kind,
  label,
  value,
  onChange,
}: {
  kind: 'logo' | 'signature'
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const [busy, setBusy] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadDoctorAsset(kind, file))
      toast.success(`${label} uploaded`)
    } catch (error) {
      toast.error(`Could not upload ${label.toLowerCase()}`, {
        description: (error as Error).message,
      })
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  return (
    <Field label={label} hint="Appears on every prescription PDF.">
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-surface-500 bg-surface-100">
          {value ? (
            <img src={value} alt={label} className="size-full object-contain p-1.5" />
          ) : (
            <span className="text-[0.65rem] font-semibold uppercase text-muted-foreground">
              None
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {value ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </Field>
  )
}

export function SettingsPage() {
  const { data: doctor, isLoading } = useDoctorProfile()
  const save = useSaveDoctorProfile()
  const [form, setForm] = React.useState<Form | null>(null)
  const [theme, setTheme] = React.useState<ThemeColors | null>(null)
  const [showKey, setShowKey] = React.useState(false)

  React.useEffect(() => {
    if (doctor && !form) {
      setForm(toForm(doctor))
      setTheme(themeFrom(doctor.theme_primary, doctor.theme_background))
    }
  }, [doctor, form])

  if (isLoading || !form || !theme) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev!, ...patch }))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!form!.full_name.trim()) {
      toast.error('Your name cannot be empty', { description: 'It prints on every prescription.' })
      return
    }

    const years = Number.parseInt(form!.years_experience, 10)
    const patch: Partial<DoctorProfile> = {
      ...(Object.fromEntries(
        TEXT_FIELDS.map((key) => [key, form![key].trim() || null]),
      ) as Partial<DoctorProfile>),
      full_name: form!.full_name.trim(),
      years_experience: Number.isFinite(years) ? years : null,
      theme_primary: theme!.primary,
      theme_background: theme!.background,
    }
    save.mutate(patch)
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://<your-project>.supabase.co'
  const functionsBase = `${supabaseUrl.replace('.supabase.co', '.functions.supabase.co')}`

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-brand-800 sm:text-4xl">
            Settings
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your profile, clinic details, and the connection to your WhatsApp agent.
          </p>
        </div>
        <Button type="submit" size="lg" loading={save.isPending}>
          <Check />
          Save changes
        </Button>
      </header>

      {/* ------------------------------------------------------ doctor profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Stethoscope className="size-5 text-brand-500" />
            Your profile
          </CardTitle>
          <CardDescription>
            Signed in as {doctor?.email ?? 'this account'}. Printed on every prescription you issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="full_name">
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => set({ full_name: e.target.value })}
                placeholder="Dr. Asha Rao"
              />
            </Field>
            <Field label="Degrees" htmlFor="qualifications">
              <Input
                id="qualifications"
                value={form.qualifications}
                onChange={(e) => set({ qualifications: e.target.value })}
                placeholder="MBBS, MD (General Medicine)"
              />
            </Field>
            <Field label="Specialization" htmlFor="specialization">
              <Input
                id="specialization"
                value={form.specialization}
                onChange={(e) => set({ specialization: e.target.value })}
                placeholder="General Physician"
              />
            </Field>
            <Field label="Registration no." htmlFor="registration_no">
              <Input
                id="registration_no"
                value={form.registration_no}
                onChange={(e) => set({ registration_no: e.target.value })}
                placeholder="KMC-123456"
              />
            </Field>
            <Field label="Years of experience" htmlFor="years_experience">
              <Input
                id="years_experience"
                type="number"
                min={0}
                max={80}
                value={form.years_experience}
                onChange={(e) => set({ years_experience: e.target.value })}
                placeholder="12"
              />
            </Field>
            <Field label="Contact number" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------- clinic profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Building2 className="size-5 text-brand-500" />
            Clinic profile
          </CardTitle>
          <CardDescription>Printed at the top of every prescription.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Clinic name" htmlFor="clinic_name">
            <Input
              id="clinic_name"
              value={form.clinic_name}
              onChange={(e) => set({ clinic_name: e.target.value })}
              placeholder="Sunrise Clinic"
            />
          </Field>

          <Field label="Address" htmlFor="address">
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="12 MG Road, Bengaluru 560001 · +91 80 1234 5678"
              className="min-h-[90px]"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <AssetUpload
              kind="logo"
              label="Clinic logo"
              value={form.logo_url}
              onChange={(url) => set({ logo_url: url })}
            />
            <AssetUpload
              kind="signature"
              label="Doctor signature"
              value={form.signature_url}
              onChange={(url) => set({ signature_url: url })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Palette className="size-5 text-brand-500" />
            Colours
          </CardTitle>
          <CardDescription>
            Pick a brand colour and a background colour — the dashboard and your prescription
            letterhead follow both.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker value={theme} onChange={setTheme} />
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- meeting link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Video className="size-5 text-brand-500" />
            Video consultation
          </CardTitle>
          <CardDescription>
            Paste your personal meeting room link once — "Start Meeting" opens it every time. If the
            booking agent sends a per-appointment link, that one wins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Default meeting link" htmlFor="default_meeting_link">
            <Input
              id="default_meeting_link"
              type="url"
              value={form.default_meeting_link}
              onChange={(e) => set({ default_meeting_link: e.target.value })}
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </Field>

          <Field
            label="Working hours"
            htmlFor="working_hours"
            hint="Shown for reference. Slot availability is decided by the booking agent."
          >
            <Input
              id="working_hours"
              value={form.working_hours}
              onChange={(e) => set({ working_hours: e.target.value })}
              placeholder="Mon–Sat, 10:00 AM – 6:00 PM"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------ n8n link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Plug className="size-5 text-brand-500" />
            WhatsApp booking agent (n8n)
          </CardTitle>
          <CardDescription>
            Where this dashboard sends prescriptions and appointment changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field
            label="n8n webhook base URL"
            htmlFor="n8n_webhook_url"
            hint="The dashboard appends /send-prescription and /appointment-updated to this."
          >
            <Input
              id="n8n_webhook_url"
              type="url"
              value={form.n8n_webhook_url}
              onChange={(e) => set({ n8n_webhook_url: e.target.value })}
              placeholder="https://your-n8n.app/webhook"
            />
          </Field>

          <Field
            label="Your API key"
            htmlFor="n8n_api_key"
            hint="Issued to you, and yours alone — it is how the endpoints below know a booking belongs to your practice. Send it as the x-api-key header from your n8n workflow."
          >
            <div className="flex gap-2">
              <Input
                id="n8n_api_key"
                type={showKey ? 'text' : 'password'}
                value={doctor?.n8n_api_key ?? ''}
                readOnly
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy API key"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(doctor?.n8n_api_key ?? '')
                    toast.success('API key copied')
                  } catch {
                    toast.error('Could not copy', { description: 'Reveal it and copy by hand.' })
                  }
                }}
              >
                <Copy />
              </Button>
            </div>
          </Field>

          <div className="space-y-2.5 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
              <Link2 className="size-4" />
              Endpoints for your n8n workflow to call
            </p>
            <CopyableUrl label="Create booking" value={`${functionsBase}/appointments`} />
            <CopyableUrl
              label="Cancel booking"
              value={`${functionsBase}/appointments/{appointment_id}/cancel`}
            />
            <CopyableUrl
              label="Delivery callback"
              value={`${functionsBase}/prescription-delivery-callback`}
            />
            <p className="text-xs text-muted-foreground">
              All three expect the header <code className="font-mono">x-api-key</code> with your key
              above. Bookings sent with it land in your dashboard only.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="xl" loading={save.isPending}>
          <Check />
          Save changes
        </Button>
      </div>
    </form>
  )
}
