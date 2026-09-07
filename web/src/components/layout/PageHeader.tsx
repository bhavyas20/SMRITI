import type { ReactNode } from 'react'

import { Eyebrow } from '@/components/ui/card.tsx'
import { cn } from '@/lib/utils.ts'

/**
 * The heading block at the top of every screen inside the app shell.
 *
 * The `description` is not decoration. Each screen in this product answers a
 * question a worried adult child is holding, and saying which question in one
 * plain sentence is most of what makes a data screen usable by someone who is
 * not a clinician.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="text-[clamp(24px,3vw,32px)] leading-tight">{title}</h1>
        {description && (
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-body">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
