import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-semibold uppercase tracking-wide text-brand-700/80',
      className,
    )}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

/** Label + control + optional hint, the standard field wrapper used by all forms. */
export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export { Label }
