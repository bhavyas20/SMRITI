import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils.ts'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill font-body font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-ink/[0.06] text-body',
        sage: 'bg-sage-soft text-sage',
        warm: 'bg-clay text-bark',
        gold: 'bg-gold/20 text-[#8A6210]',
        alert: 'bg-alert/12 text-alert',
        dark: 'bg-ivory/15 text-ivory',
        outline: 'border border-ink/20 text-body',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-1 text-[12.5px]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

export { badgeVariants }
