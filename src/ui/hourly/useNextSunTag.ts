import { useEffect, useRef, useState } from 'react'
import type { TimelineSlot } from './timeline'

export type AwaySide = 'left' | 'right'

/**
 * The next sun event's marker can sit past the visible hours (sunset seen from the morning). While it is scrolled
 * out of view, a tag at that edge names it, and tapping it scrolls the marker into the middle.
 */
export function useNextSunTag(enabled: boolean, slots: TimelineSlot[]) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [away, setAway] = useState<AwaySide | null>(null)
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!enabled || !scroller) return
    let frame = 0
    const check = () => {
      frame = 0
      const marker = scroller.querySelector<HTMLElement>('[data-sun]')
      if (!marker) return setAway(null)
      const box = scroller.getBoundingClientRect()
      const x = marker.getBoundingClientRect().left
      // Inside the edge fades, the hairline is too faint to count as shown.
      setAway(x < box.left + 24 ? 'left' : x > box.right - 24 ? 'right' : null)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check) }
    check()
    scroller.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [enabled, slots])
  const bring = () => {
    const scroller = scrollerRef.current
    const marker = scroller?.querySelector<HTMLElement>('[data-sun]')
    if (!scroller || !marker) return
    const box = scroller.getBoundingClientRect()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollBy({
      left: marker.getBoundingClientRect().left - (box.left + box.width / 2),
      behavior: reduced ? 'auto' : 'smooth',
    })
  }
  return [scrollerRef, away, bring] as const
}
