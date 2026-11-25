import { useEffect, useRef, useState } from 'react'
import type { TimelineSlot } from './timeline'

export type AwaySide = 'left' | 'right'

interface ScrollView {
  earlier: boolean
  later: boolean
  away: AwaySide | null
}

/** Track the visible hours and any offscreen sun marker using the same scroll and resize events. */
export function useHourlyScroll(enabled: boolean, slots: TimelineSlot[]) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<ScrollView>({ earlier: false, later: false, away: null })
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!enabled || !scroller) return
    let frame = 0
    const check = () => {
      frame = 0
      // In RTL the scrollbar starts at the right edge and becomes negative toward later hours.
      const offset = -scroller.scrollLeft
      const earlier = offset > 1
      const later = offset < scroller.scrollWidth - scroller.clientWidth - 1
      const marker = scroller.querySelector<HTMLElement>('[data-sun]')
      let away: AwaySide | null = null
      if (marker) {
        const box = scroller.getBoundingClientRect()
        const x = marker.getBoundingClientRect().left
        const captionWidth = marker.firstElementChild?.getBoundingClientRect().width ?? 0
        const buffer = captionWidth / 2 + 16
        away = x < box.left + buffer ? 'left' : x > box.right - buffer ? 'right' : null
      }
      setView((current) => current.earlier === earlier && current.later === later && current.away === away
        ? current : { earlier, later, away })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check) }
    check()
    const resize = new ResizeObserver(schedule)
    resize.observe(scroller)
    if (scroller.firstElementChild) resize.observe(scroller.firstElementChild)
    scroller.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      scroller.removeEventListener('scroll', schedule)
    }
  }, [enabled, slots])
  const scrollBy = (scroller: HTMLDivElement, left: number) => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollBy({ left, behavior: reduced ? 'auto' : 'smooth' })
  }

  const pageBy = (direction: 'earlier' | 'later') => {
    const scroller = scrollerRef.current
    const slot = scroller?.querySelector('li')
    if (!scroller || !slot || !view[direction]) return
    const width = slot.getBoundingClientRect().width
    if (width <= 0) return
    // Keep at least one hour of context between pages where the viewport allows it.
    const slotsToMove = Math.max(1, Math.floor(scroller.clientWidth / width) - 1)
    scrollBy(scroller, (direction === 'later' ? -1 : 1) * width * slotsToMove)
  }

  const bringNextSun = (fromKeyboard: boolean) => {
    const scroller = scrollerRef.current
    const marker = scroller?.querySelector<HTMLElement>('[data-sun]')
    if (!scroller || !marker) return
    const box = scroller.getBoundingClientRect()
    const markerX = marker.getBoundingClientRect().left
    if (fromKeyboard) {
      const buttons = scroller.querySelectorAll<HTMLButtonElement>('[data-index]')
      const first = buttons[0]?.getBoundingClientRect()
      if (first) buttons[Math.floor((first.right - markerX) / first.width)]?.focus({ preventScroll: true })
    }
    scrollBy(scroller, markerX - (box.left + box.width / 2))
  }
  return { scrollerRef, ...view, bringNextSun, pageBy }
}
