import { useEffect } from 'react'

import { FeatureSlider } from './FeatureSlider.tsx'
import { Hero } from './Hero.tsx'
import { MarketingNav } from './MarketingNav.tsx'
import {
  FinalCta,
  HowItWorks,
  MarketingFooter,
  ProductPreview,
  StatBand,
  Stories,
} from './Sections.tsx'

/**
 * The public marketing site.
 *
 * Section order follows the reference; the colour does not. The reference ran
 * terracotta → cream → cream → sand → cream → ivory → terracotta, which is one
 * hue doing almost all the work and is why the page read as monotonous below
 * the fold. Here each section takes a distinct ground — terracotta, cream,
 * ivory, **sage**, sand, ivory, terracotta, cream — and the gold/coral gradient
 * stays reserved for the two moments that actually matter, the primary buttons.
 *
 * Every section below the hero arrives on scroll (`<Reveal />`), which is the
 * other half of the same problem: the reference animated the hero and then
 * nothing, so the page had spent everything it had by the first scroll.
 */
export default function MarketingPage() {
  // Smooth anchor scrolling, scoped to this page so it does not affect the app.
  useEffect(() => {
    const previous = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = previous
    }
  }, [])

  return (
    <div className="overflow-x-hidden bg-terracotta">
      <MarketingNav />
      <Hero />
      <HowItWorks />
      <FeatureSlider />
      <StatBand />
      <ProductPreview />
      <Stories />
      <FinalCta />
      <MarketingFooter />
    </div>
  )
}
