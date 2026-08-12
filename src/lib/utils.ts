import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Ravi Kumar" -> "RK" */
export function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** "34 yrs · Male" — tolerates missing values without printing "null". */
export function describePatient(age?: number | null, gender?: string | null) {
  const parts: string[] = []
  if (age != null) parts.push(`${age} yrs`)
  if (gender) parts.push(gender.charAt(0).toUpperCase() + gender.slice(1))
  return parts.join(' · ') || 'Details not captured'
}

export function isBlank(v?: string | null) {
  return !v || v.trim().length === 0
}
