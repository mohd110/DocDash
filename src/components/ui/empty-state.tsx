import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Friendly empty states, never a blank screen (§7.7). */
export function EmptyState({
  emoji = '🎉',
  title,
  description,
  action,
  className,
}: {
  emoji?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-cream-500/60 bg-cream-100/60 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="text-4xl" aria-hidden>
        {emoji}
      </div>
      <h3 className="font-display text-xl font-semibold text-bottle-800">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
