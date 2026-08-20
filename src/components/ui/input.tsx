import * as React from 'react'
import { cn } from '@/lib/utils'

export const inputBaseClass =
  'flex h-12 w-full rounded-lg border-2 border-surface-500/50 bg-card px-4 py-2 text-[0.95rem] text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60 disabled:cursor-not-allowed disabled:opacity-60'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(inputBaseClass, className)} {...props} />
  ),
)
Input.displayName = 'Input'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(inputBaseClass, 'min-h-[120px] resize-y py-3 leading-relaxed', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

/** Native select, styled to match. Deliberately not a custom listbox — it is
 *  bigger, keyboard-native and works on tablets without extra learning. */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(inputBaseClass, 'cursor-pointer appearance-none pr-10', className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230B5540' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.75rem center',
      backgroundSize: '1.1rem',
    }}
    {...props}
  />
))
Select.displayName = 'Select'

export { Input, Textarea, Select }
