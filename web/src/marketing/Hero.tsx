import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LogoReveal } from '@/components/brand/LogoReveal.tsx'
import { Button } from '@/components/ui/button.tsx'
import { gradient } from '@/styles/tokens.ts'

const HERO_VIDEOS = ['/fansipan.mp4', '/sss.mp4', '/44.mp4']
const FIRST_VIDEO_PLAYBACK_RATE = 1.1
const LATER_VIDEO_PLAYBACK_RATE = 0.82
const FIRST_VIDEO_DURATION_SECONDS = 6
const LAST_VIDEO_TAIL_CUTOFF_SECONDS = 2

/**
 * The hero.
 *
 * The reveal is `<LogoReveal />` — the same component the app plays after a
 * fresh sign-in — rather than a set of CSS keyframes written for this page
 * alone. That is the whole point of it being a component: the logo animates
 * identically wherever it appears, and changing its choreography is one edit.
 *
 * Everything after the mark is timed off `LOGO_REVEAL_DURATION`, so if the
 * reveal is ever re-cut the copy still follows it instead of colliding.
 */
export function Hero() {
  const reduceMotion = useReducedMotion()
  const [showVideo, setShowVideo] = useState(false)
  const [videoIndex, setVideoIndex] = useState(0)
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0)
  const [videoSources, setVideoSources] = useState<[string, string]>([HERO_VIDEOS[0], ''])
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)] as const

  const playbackRate = videoIndex === 0 ? FIRST_VIDEO_PLAYBACK_RATE : LATER_VIDEO_PLAYBACK_RATE

  const advanceVideo = () => {
    const nextIndex = (videoIndex + 1) % HERO_VIDEOS.length
    const nextLayer: 0 | 1 = activeLayer === 0 ? 1 : 0
    setVideoSources((sources) => {
      const nextSources: [string, string] = [...sources]
      nextSources[nextLayer] = HERO_VIDEOS[nextIndex]
      return nextSources
    })
    setVideoIndex(nextIndex)
    setActiveLayer(nextLayer)
  }

  useEffect(() => {
    if (!showVideo) return
    const activeVideo = videoRefs[activeLayer].current
    if (!activeVideo) return
    activeVideo.playbackRate = playbackRate
    activeVideo.load()
    void activeVideo.play().catch(() => undefined)

    const inactiveLayer: 0 | 1 = activeLayer === 0 ? 1 : 0
    const pauseTimer = window.setTimeout(() => {
      videoRefs[inactiveLayer].current?.pause()
    }, 950)
    return () => window.clearTimeout(pauseTimer)
  }, [activeLayer, playbackRate, showVideo, videoSources])

  const copy = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.85,
            delay,
            ease: [0.2, 0.8, 0.2, 1] as const,
          },
        }

  return (
    <header
      id="top"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-12"
      style={{ background: gradient.hero }}
    >
      {showVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-0"
        >
          {[0, 1].map((layer) => (
            <motion.video
              key={layer}
              ref={videoRefs[layer]}
              className="absolute inset-0 h-full w-full object-cover"
              src={videoSources[layer] || undefined}
              initial={false}
              animate={{ opacity: layer === activeLayer ? 1 : 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              autoPlay
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(event) => {
                event.currentTarget.playbackRate = playbackRate
              }}
              onTimeUpdate={(event) => {
                const video = event.currentTarget
                if (layer !== activeLayer) return
                const firstVideoIsDone =
                  videoIndex === 0 && video.currentTime >= FIRST_VIDEO_DURATION_SECONDS
                const lastVideoIsDone =
                  videoIndex === HERO_VIDEOS.length - 1 &&
                  Number.isFinite(video.duration) &&
                  video.duration > LAST_VIDEO_TAIL_CUTOFF_SECONDS &&
                  video.currentTime >= video.duration - LAST_VIDEO_TAIL_CUTOFF_SECONDS
                if (firstVideoIsDone || lastVideoIsDone) {
                  advanceVideo()
                }
              }}
              onEnded={() => {
                if (layer === activeLayer) advanceVideo()
              }}
              aria-hidden="true"
            />
          ))}
          <div className="absolute inset-0 bg-ink/45" />
        </motion.div>
      )}

      <div className="relative z-10 flex w-full max-w-[880px] flex-col items-center">
        <LogoReveal
          size={112}
          wordmarkSize={undefined}
          speed={1}
          onComplete={() => setShowVideo(true)}
        />

        <motion.h1
          {...copy(0)}
          className="mt-8 max-w-[19ch] text-center text-[clamp(32px,5.4vw,62px)] leading-[1.06] text-ivory"
        >
          Be close to their day, from wherever you are.
        </motion.h1>

        <motion.p
          {...copy(0.2)}
          className="mt-4 max-w-[52ch] text-center text-[clamp(15.5px,1.5vw,19px)] leading-relaxed text-ivory/90"
        >
          Smriti quietly keeps track of your parent&rsquo;s routines, medicine and mood at
          home — and tells the family what actually matters. Nothing to wear. Nothing to
          charge.
        </motion.p>

        <motion.div
          {...copy(0.4)}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Button asChild variant="accent" size="lg">
            <Link to="/auth">Start free for 30 days</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="border border-ivory/45 bg-transparent text-ivory hover:bg-ivory/12"
          >
            <a href="#how">See how it works</a>
          </Button>
        </motion.div>

        <motion.p {...copy(0.6)} className="mt-6 text-center text-[13.5px] text-ivory/66">
          Set up in one evening &middot; Your parent stays in control &middot; Cancel any time
        </motion.p>
      </div>

      <a
        href="#how"
        aria-label="Scroll to how it works"
        className="absolute inset-x-0 bottom-5 mx-auto w-fit text-ivory/50 animate-bob"
      >
        <ArrowDown className="size-5" strokeWidth={2.75} />
      </a>
    </header>
  )
}
