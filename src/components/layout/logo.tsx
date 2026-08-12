import { cn } from '@/lib/utils'

/** The Hakiman mark — a cream mortar-and-pestle 'H' on bottle green. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-10', className)} aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-bottle-600" />
      <path
        d="M32 48s-13-8.2-13-17.2A7.8 7.8 0 0 1 32 25.6a7.8 7.8 0 0 1 13 5.2C45 39.8 32 48 32 48Z"
        className="fill-cream-100"
      />
      <path
        d="M32 30v10M27 35h10"
        className="stroke-bottle-600"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo />
      <div className="leading-none">
        <div className="font-display text-2xl font-semibold tracking-tight text-bottle-800">
          Hakiman
        </div>
        <div className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-bottle-500/80">
          Clinic Desk
        </div>
      </div>
    </div>
  )
}
