import type { ReactNode } from 'react'
import { AlertTriangle, Info, ShieldOff } from 'lucide-react'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { cn } from '@/lib/utils.ts'

/**
 * Empty states.
 *
 * Every list in this app can legitimately be empty — a newly created profile
 * has no memos, no flags and no history — so "nothing here" is a normal state,
 * not an error, and it gets a real design: what this list is for, and the one
 * action that fills it. A blank panel with the word "None" teaches a caregiver
 * nothing and makes a working app look broken.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center overflow-hidden rounded-card border border-dashed border-ink/12 bg-gradient-to-b from-sand/45 to-ivory px-6 py-12 text-center',
        className,
      )}
    >
      <svg className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 w-full opacity-20" viewBox="0 0 500 70" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 62 72 26l43 24 72-34 69 30 74-38 170 44v18H0Z" fill="var(--color-sage)" />
        <path d="M0 62 72 26l43 24 72-34 69 30 74-38 170 44" fill="none" stroke="var(--color-terracotta)" strokeWidth="2" />
      </svg>
      <div className="relative grid size-14 place-items-center rounded-full bg-ivory text-terracotta shadow-sm">
        {icon ?? <Logomark size={24} decorative />}
      </div>
      <p className="mt-4 font-heading text-lg font-bold">{title}</p>
      {description && (
        <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-body">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * A failed query. Deliberately distinguishes "you don't have access" from
 * "something went wrong", because the first is a permanent answer the
 * caregiver can act on and the second is worth retrying.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  const isPermission =
    /permission|policy|not authori|caregiver only|row-level/i.test(message)

  return (
    <div
      role="alert"
      className={cn(
        'rounded-card border px-5 py-5',
        isPermission ? 'border-ink/12 bg-sand/50' : 'border-alert/25 bg-alert/[0.06]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5', isPermission ? 'text-muted' : 'text-alert')}>
          {isPermission ? <ShieldOff className="size-5" /> : <AlertTriangle className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-heading font-bold">
            {isPermission ? "You don't have access to this" : "This didn't load"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-body">
            {isPermission
              ? 'Ask whoever set up this profile to add you, or check you are signed in with the right number.'
              : message}
          </p>
          {onRetry && !isPermission && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-sm font-semibold text-bark underline-offset-4 hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** A quiet in-page notice. Used for "coming soon" and read-only explanations. */
export function Notice({
  children,
  tone = 'info',
  className,
}: {
  children: ReactNode
  tone?: 'info' | 'warn'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-[0_5px_16px_rgba(54,39,24,0.035)]',
        tone === 'info'
          ? 'border-ink/[0.06] bg-sand/55 text-body'
          : 'border-gold/20 bg-gold/10 text-[#6F4E0C]',
        className,
      )}
    >
      {tone === 'info' ? (
        <Info className="mt-0.5 size-4 flex-none text-muted" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 flex-none text-gold" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
