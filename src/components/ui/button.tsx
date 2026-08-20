import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-surface-100 shadow-card hover:bg-brand-700 hover:shadow-lift',
        secondary:
          'bg-surface-200 text-brand-800 border border-surface-500/50 hover:bg-surface-300',
        outline:
          'border-2 border-brand-600/25 bg-card text-brand-800 hover:border-brand-600/60 hover:bg-brand-50',
        ghost: 'text-brand-800 hover:bg-brand-50',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        // Large touch targets throughout — the doctor may be on a tablet (§7)
        sm: 'h-10 px-3.5 text-sm [&_svg]:size-4',
        md: 'h-12 px-5 text-[0.95rem] [&_svg]:size-[18px]',
        lg: 'h-14 px-7 text-base [&_svg]:size-5',
        xl: 'h-16 px-9 text-lg [&_svg]:size-6',
        icon: 'h-12 w-12 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        /* Default to "button": an untyped <button> inside a <form> submits it,
           which would make Copy/Show/Remove buttons save the whole form. */
        {...(asChild ? {} : { type: type ?? 'button' })}
        disabled={disabled || loading}
        {...props}
      >
        {/* Slot needs exactly one child, so the spinner is skipped when asChild */}
        {loading && !asChild ? (
          <>
            <Loader2 className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
