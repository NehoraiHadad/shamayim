import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { addMinutes, minutesBetweenLocal } from '../../domain/minutes'
import { clockOf } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { isolateText, ltr } from '../../text/isolate'
import { SCRUBBER_HINT } from '../../text/scrub'
import { keyStep } from '../../ui/scrub/keyStep'
import styles from './Scene.module.css'

/** Minutes of the day per px of finger travel: a thumb's sweep across the valley covers about a day. */
const MIN_PER_PX = 4

interface Props {
  /** The shown moment (now or the moved time). */
  at: LocalTime
  now: LocalTime
  /** The strip's first and last hours bound the scrub. */
  first: LocalTime
  last: LocalTime
  /** Describes the shown hour while time is moved; null at now. */
  readout: string | null
  onScrub: (time: LocalTime) => void
  onRelease: () => void
  onNow: () => void
}

/**
 * The valley is the touch scrubber: a horizontal drag moves time (RTL, so a finger moving left goes later), vertical
 * drags still scroll the page. For keyboards and screen readers it is a slider stepping by the hour.
 */
export function SceneScrubber({ at, now, first, last, readout, onScrub, onRelease, onNow }: Props) {
  const hintId = useId()
  const drag = useRef<{ id: number; x: number; at: LocalTime } | null>(null)
  const clamp = (time: LocalTime) => (time < first ? first : time > last ? last : time)

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    drag.current = { id: e.pointerId, x: e.clientX, at }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d?.id !== e.pointerId || e.clientX === d.x) return
    onScrub(clamp(addMinutes(d.at, (d.x - e.clientX) * MIN_PER_PX)))
  }
  // Lifting the finger, or the browser taking over for a vertical scroll, starts the hold before the way back to now.
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    // After a pointercancel the capture is already gone and releasing it would throw before onRelease.
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    onRelease()
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); onNow(); return }
    const next = keyStep(e.key, minutesBetweenLocal(first, at), 0, minutesBetweenLocal(first, last), 60)
    if (next === null) return
    e.preventDefault()
    onScrub(addMinutes(first, next))
    onRelease()
  }

  return (
    <>
      <div className={styles.scrubber} role="slider" tabIndex={0} aria-label="שעה בעמק"
        aria-describedby={hintId}
        aria-valuemin={minutesBetweenLocal(now, first)} aria-valuemax={minutesBetweenLocal(now, last)}
        aria-valuenow={minutesBetweenLocal(now, at)}
        aria-valuetext={readout ? isolateText(readout) : `עכשיו, ${ltr(clockOf(now))}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} />
      <span id={hintId} className="visually-hidden">{SCRUBBER_HINT}</span>
    </>
  )
}
