import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import type { DoctorSignupDetails } from '@/lib/types'

export const EMPTY_DETAILS: DoctorSignupDetails = {
  full_name: '',
  qualifications: '',
  specialization: '',
  registration_no: '',
  years_experience: '',
  phone: '',
  clinic_name: '',
  address: '',
  working_hours: '',
}

/** Only the two that identify the doctor are enforced; the rest can wait. */
export function detailsAreValid(details: DoctorSignupDetails) {
  return details.full_name.trim().length > 0 && details.qualifications.trim().length > 0
}

/**
 * The professional questions asked at sign-up. The same fields back the
 * onboarding screen and the Settings page, so a doctor edits one shape of
 * profile wherever they meet it.
 */
export function DoctorDetailsFields({
  value,
  onChange,
  idPrefix = 'doctor',
}: {
  value: DoctorSignupDetails
  onChange: (patch: Partial<DoctorSignupDetails>) => void
  idPrefix?: string
}) {
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor={id('full_name')} hint="As it should print on prescriptions.">
          <Input
            id={id('full_name')}
            required
            autoComplete="name"
            value={value.full_name}
            onChange={(e) => onChange({ full_name: e.target.value })}
            placeholder="Dr. Asha Rao"
          />
        </Field>

        <Field label="Degrees" htmlFor={id('qualifications')} hint="Comma separated.">
          <Input
            id={id('qualifications')}
            required
            value={value.qualifications}
            onChange={(e) => onChange({ qualifications: e.target.value })}
            placeholder="MBBS, MD (General Medicine)"
          />
        </Field>

        <Field label="Specialization" htmlFor={id('specialization')}>
          <Input
            id={id('specialization')}
            value={value.specialization}
            onChange={(e) => onChange({ specialization: e.target.value })}
            placeholder="General Physician"
          />
        </Field>

        <Field label="Medical registration no." htmlFor={id('registration_no')}>
          <Input
            id={id('registration_no')}
            value={value.registration_no}
            onChange={(e) => onChange({ registration_no: e.target.value })}
            placeholder="KMC-123456"
          />
        </Field>

        <Field label="Years of experience" htmlFor={id('years_experience')}>
          <Input
            id={id('years_experience')}
            type="number"
            min={0}
            max={80}
            value={value.years_experience}
            onChange={(e) => onChange({ years_experience: e.target.value })}
            placeholder="12"
          />
        </Field>

        <Field label="Contact number" htmlFor={id('phone')}>
          <Input
            id={id('phone')}
            type="tel"
            autoComplete="tel"
            value={value.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+91 98765 43210"
          />
        </Field>

        <Field label="Clinic name" htmlFor={id('clinic_name')}>
          <Input
            id={id('clinic_name')}
            value={value.clinic_name}
            onChange={(e) => onChange({ clinic_name: e.target.value })}
            placeholder="Sunrise Clinic"
          />
        </Field>

        <Field
          label="Working hours"
          htmlFor={id('working_hours')}
          hint="Shown for reference on prescriptions."
        >
          <Input
            id={id('working_hours')}
            value={value.working_hours}
            onChange={(e) => onChange({ working_hours: e.target.value })}
            placeholder="Mon–Sat, 10:00 AM – 6:00 PM"
          />
        </Field>
      </div>

      <Field label="Clinic address" htmlFor={id('address')}>
        <Textarea
          id={id('address')}
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="12 MG Road, Bengaluru 560001 · +91 80 1234 5678"
          className="min-h-[90px]"
        />
      </Field>
    </div>
  )
}
