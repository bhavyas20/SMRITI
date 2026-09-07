import { Link } from 'react-router-dom'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { cn } from '@/lib/utils.ts'
import { useScrollSolid } from './useScrollSolid.ts'

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#stories', label: 'Stories' },
]

/**
 * The sticky nav.
 *
 * It starts transparent over the terracotta hero and turns into a solid cream
 * bar once you have scrolled past it — the same behaviour as the reference,
 * rebuilt on a passive scroll listener instead of a permanent rAF loop.
 */
export function MarketingNav() {
  const solid = useScrollSolid()

  return (
    <nav
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex items-center gap-4 px-4 py-3.5 backdrop-blur-md sm:gap-6 sm:px-8',
        'transition-[background-color,color,box-shadow] duration-350',
        solid ? 'bg-cream/94 text-ink shadow-nav' : 'bg-transparent text-ivory',
      )}
    >
      <a href="#top" className="mr-auto flex items-center gap-2.5 text-current">
        <Logomark size={26} decorative />
        <Wordmark size={19} />
      </a>

      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="hidden text-[14.5px] font-medium opacity-85 transition-opacity hover:opacity-100 sm:inline"
        >
          {link.label}
        </a>
      ))}

      <Link
        to="/auth"
        className={cn(
          'rounded-pill px-5 py-2.5 text-[14px] font-semibold transition-colors duration-350',
          solid ? 'bg-terracotta text-ivory' : 'bg-ivory/15 text-ivory hover:bg-ivory/25',
        )}
      >
        Get started
      </Link>
    </nav>
  )
}
