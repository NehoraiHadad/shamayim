import { useEffect, useRef, type PointerEvent, type RefObject } from 'react'
import type { LocalTime } from '../../domain/types'
import { SLOT_W, timeAtX } from './stripLayout'
import type { TimelineSlot } from './timeline'

interface Options {
  scrollerRef: RefObject<HTMLDivElement | null>
  slots: TimelineSlot[]
  /** The hour of the shown time ("2026-11-17T14"), or undefined for now. */
  shownHour: string | undefined
  scrubbing: boolean
  first: LocalTime | undefined
  width: number
  onScrub?: (time: LocalTime) => void
  onRelease?: () => void
}

/**
 * Mouse and pen drag along the track moves time continuously (touch keeps native scroll and tap; touch scrubs on the
 * valley). When time moves from elsewhere (the valley, a rewind), the strip follows it to keep that hour in view.
 */
export function useStripScrub({ scrollerRef, slots, shownHour, scrubbing, first, width, onScrub, onRelease }: Options) {
  const selectedIndex = shownHour
    ? slots.filter((slot) => slot.type === 'hour').findIndex((hour) => hour.time.startsWith(shownHour)) : -1
  const drag = useRef<number | null>(null)
  // Pressed but not yet moved: a click stays a click (it picks the hour); 4 px of travel turns it into a scrub.
  const press = useRef<{ id: number; x: number } | null>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    // A drag that started here must not scroll the track under its own pointer (it would feed back into the time).
    if (!scroller || selectedIndex < 0 || drag.current !== null) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    scroller.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest',
      behavior: scrubbing || reduced ? 'auto' : 'smooth' })
  }, [shownHour, selectedIndex, scrubbing, scrollerRef])

  const scrubAt = (e: PointerEvent<HTMLDivElement>) => {
    if (!first) return
    const box = e.currentTarget.getBoundingClientRect()
    const logicalX = (e.clientX - box.left) * width / box.width
    const x = Math.min(width - SLOT_W / 2, Math.max(SLOT_W / 2, logicalX))
    onScrub?.(timeAtX(x, first, width))
  }
  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current !== e.pointerId) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    onRelease?.()
  }
  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'touch' && onScrub && e.button === 0) press.current = { id: e.pointerId, x: e.clientX }
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const p = press.current
      if (drag.current === null && p?.id === e.pointerId && Math.abs(e.clientX - p.x) >= 4) {
        drag.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      if (drag.current === e.pointerId) scrubAt(e)
    },
    onPointerUp: (e: PointerEvent<HTMLDivElement>) => { press.current = null; end(e) },
    onPointerCancel: (e: PointerEvent<HTMLDivElement>) => { press.current = null; end(e) },
  }
}
