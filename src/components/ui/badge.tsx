import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide',
  {
    variants: {
      tone: {
        /* PRD §7.5 — status is always readable by colour alone */
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        green: 'border-bottle-200 bg-bottle-50 text-bottle-700',
        gray: 'border-stone-200 bg-stone-100 text-stone-600',
        red: 'border-red-200 bg-red-50 text-red-700',
        cream: 'border-cream-500/50 bg-cream-200 text-bottle-700',
      },
    },
    defaultVariants: { tone: 'cream' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { badgeVariants }
