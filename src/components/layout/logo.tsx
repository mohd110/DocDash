import { cn } from '@/lib/utils'

/** The DocDash mark — a cream care symbol on bottle green. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-10', className)} aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-brand-600" />
      <path
        d="M32 48s-13-8.2-13-17.2A7.8 7.8 0 0 1 32 25.6a7.8 7.8 0 0 1 13 5.2C45 39.8 32 48 32 48Z"
        className="fill-surface-100"
      />
      <path
        d="M32 30v10M27 35h10"
        className="stroke-brand-600"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Defaults to the product brand. Inside the app the signed-in doctor's own
 * clinic name is passed instead, so each tenant sees their own practice.
 */
export function Wordmark({
  className,
  title = 'DocDash',
  subtitle = 'Clinic Desk',
}: {
  className?: string
  title?: string
  subtitle?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo />
      <div className="min-w-0 leading-none">
        <div className="truncate font-display text-2xl font-semibold tracking-tight text-brand-800">
          {title}
        </div>
        <div className="mt-1 truncate text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand-500/80">
          {subtitle}
        </div>
      </div>
    </div>
  )
}
