import { gradient } from '@/styles/tokens.ts'
import { cn } from '@/lib/utils.ts'

export const WORDMARK_LETTERS = ['S', 'M', 'R', 'I', 'T', 'I'] as const

export type WordmarkProps = {
  /** Font size in px, or any CSS length. The wordmark scales from this alone. */
  size?: number | string
  color?: string
  /** The gold→coral sweep across the "S". Off for small UI chrome. */
  withSweep?: boolean
  className?: string
}

/**
 * The settled SMRITI wordmark.
 *
 * The gradient sweep lives on a duplicate "S" stacked over the real one and
 * clipped to the glyph, so the letter underneath keeps its solid colour where
 * the gradient fades out. `<LogoReveal />` animates the same two layers; this
 * component is what that animation settles into, and what every static
 * placement of the lockup renders directly.
 */
export function Wordmark({
  size = 24,
  color = 'currentColor',
  withSweep = false,
  className,
}: WordmarkProps) {
  const fontSize = typeof size === 'number' ? `${size}px` : size

  return (
    <span
      className={cn('inline-flex items-baseline font-heading font-extrabold', className)}
      style={{ fontSize, lineHeight: 1, letterSpacing: '-0.012em', color }}
      aria-label="Smriti"
      role="img"
    >
      <span className="relative inline-block" aria-hidden="true">
        S
        {withSweep && (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-clip-text text-transparent"
            style={{ backgroundImage: gradient.wordmark }}
          >
            S
          </span>
        )}
      </span>
      <span aria-hidden="true">MRITI</span>
    </span>
  )
}

export default Wordmark
