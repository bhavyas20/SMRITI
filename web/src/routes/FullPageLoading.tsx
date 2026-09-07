import { Logomark } from '@/components/brand/Logomark.tsx'

/**
 * The full-page waiting state used while a route decides what to render.
 *
 * Not a skeleton, because there is no known shape yet — at this point the app
 * genuinely does not know whether the next screen is a dashboard, an overview
 * or a setup wizard. It is the mark, breathing, with a label that says what is
 * being waited on. Short-lived by design; if a caregiver sees this for more
 * than a moment, something upstream is wrong.
 */
export function FullPageLoading({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ivory"
      role="status"
      aria-live="polite"
    >
      <Logomark size={44} color="var(--color-terracotta)" className="animate-pulse" decorative />
      <p className="text-sm text-muted">{label ?? 'Loading'}</p>
    </div>
  )
}
