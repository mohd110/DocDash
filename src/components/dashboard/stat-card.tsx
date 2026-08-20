import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'cream',
  hint,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: 'cream' | 'green' | 'blue' | 'amber'
  hint?: string
}) {
  const tones = {
    cream: 'bg-card border-surface-500/40 text-brand-800',
    green: 'bg-brand-600 border-brand-700 text-surface-100',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
  } as const

  const iconTones = {
    cream: 'bg-surface-200 text-brand-700',
    green: 'bg-surface-100/20 text-surface-100',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  } as const

  return (
    <div className={cn('rounded-2xl border p-5 shadow-card', tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
          <p className="mt-2 font-display text-4xl font-semibold leading-none">{value}</p>
          {hint && <p className="mt-2 text-xs opacity-70">{hint}</p>}
        </div>
        <span className={cn('rounded-xl p-2.5', iconTones[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  )
}
