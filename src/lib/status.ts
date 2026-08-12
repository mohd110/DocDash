import type { AppointmentStatus, DeliveryStatus } from './types'

type Tone = 'blue' | 'amber' | 'green' | 'gray' | 'red' | 'cream'

/** PRD §7.5 — one colour per status, used identically everywhere. */
export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; tone: Tone; dot: string; accent: string }
> = {
  booked: {
    label: 'Upcoming',
    tone: 'blue',
    dot: 'bg-blue-500',
    accent: 'border-l-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    tone: 'amber',
    dot: 'bg-amber-500',
    accent: 'border-l-amber-400',
  },
  completed: {
    label: 'Completed',
    tone: 'green',
    dot: 'bg-bottle-500',
    accent: 'border-l-bottle-500',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'gray',
    dot: 'bg-stone-400',
    accent: 'border-l-stone-300',
  },
  no_show: {
    label: 'No-show',
    tone: 'gray',
    dot: 'bg-stone-400',
    accent: 'border-l-stone-300',
  },
}

export const DELIVERY_META: Record<DeliveryStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Sending…', tone: 'amber' },
  sent: { label: 'Sent on WhatsApp', tone: 'green' },
  failed: { label: 'Delivery failed', tone: 'red' },
}

/** Statuses that still expect the doctor to do something. */
export const OPEN_STATUSES: AppointmentStatus[] = ['booked', 'in_progress']

export function isOpen(status: AppointmentStatus) {
  return OPEN_STATUSES.includes(status)
}

export const FREQUENCY_PRESETS = [
  '1-0-0',
  '0-0-1',
  '1-0-1',
  '1-1-1',
  '0-1-0',
  '1-1-0',
  '0-1-1',
  'SOS (as needed)',
  'Once a week',
] as const

export const INSTRUCTION_PRESETS = [
  'After food',
  'Before food',
  'With water',
  'At bedtime',
  'Empty stomach',
] as const

export const DURATION_PRESETS = ['3 days', '5 days', '7 days', '10 days', '15 days', '1 month'] as const

export const GENDERS = ['male', 'female', 'other'] as const
