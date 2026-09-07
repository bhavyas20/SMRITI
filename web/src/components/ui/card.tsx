import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils.ts'

/**
 * Cards.
 *
 * `tone` is not decoration — it is how a caregiver reads a screen at a glance.
 * `sage` means on track, `warm` means attention, `alert` means act now, and
 * `plain` means neutral information. Picking a tone for its colour rather than
 * its meaning is how a dashboard stops being scannable.
 */
const cardVariants = cva('rounded-card transition-colors', {
  variants: {
    tone: {
      plain: 'bg-ivory border border-ink/[0.07]',
      sand: 'bg-sand',
      sage: 'bg-sage-soft border border-sage/15',
      warm: 'bg-clay border border-terracotta/12',
      alert: 'bg-alert/[0.07] border border-alert/25',
      dark: 'bg-terracotta text-ivory',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    },
  },
  defaultVariants: { tone: 'plain', padding: 'md' },
})

export type CardProps = React.ComponentProps<'div'> & VariantProps<typeof cardVariants>

export function Card({ className, tone, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone, padding }), className)} {...props} />
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-start justify-between gap-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('font-heading text-lg font-bold', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm leading-relaxed text-body', className)} {...props} />
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-4', className)} {...props} />
}

/** The small uppercase kicker above a section heading. */
export function Eyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-[12px] font-medium uppercase tracking-[0.14em] text-bark',
        className,
      )}
      {...props}
    />
  )
}
