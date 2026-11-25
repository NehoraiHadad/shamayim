import { useEffect, useRef, useState } from 'react'
import type { TimelineSlot } from './timeline'

export type AwaySide = 'left' | 'right'

/** Track whether the next sun marker is outside the visible part of the strip. */
export function useHourlyScroll(enabled: boolean, slots: TimelineSlot[]) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [away, setAway] = useState<AwaySide | null>(null)
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!enabled || !scroller) return
    let frame = 0
    const check = () => {
      frame = 0
      const marker = scroller.querySelector<HTMLElement>('[data-sun]')
      let away: AwaySide | null = null
      if (marker) {
        const box = scroller.getBoundingClientRect()
        const x = marker.getBoundingClientRect().left
        const captionWidth = marker.firstElementChild?.getBoundingClientRect().width ?? 0
        const buffer = captionWidth / 2 + 16
        away = x < box.left + buffer ? 'left' : x > box.right - buffer ? 'right' : null
      }
      setAway(away)
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
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollBy({ left: markerX - (box.left + box.width / 2), behavior: reduced ? 'auto' : 'smooth' })
  }
  return { scrollerRef, away, bringNextSun }
}
