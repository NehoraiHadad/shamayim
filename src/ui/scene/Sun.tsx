import { useLayoutEffect, useRef } from 'react'
import { sunAt, type SunPoint } from './sunPath'
import styles from './ValleyScene.module.css'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const TRAVEL_STEPS = 12

function place(p: SunPoint) {
  return { left: `${(p.x * 100).toFixed(2)}%`, top: `${p.y.toFixed(1)}px` }
}

interface Props {
  point: SunPoint | null
  date: string
  lat: number
  /** 0–100; clouds veil the disc. */
  cloudCover: number
}

/** The sun disc. On first appearance it travels up from behind the Gilead to where it is now. */
export function Sun({ point, date, lat, cloudCover }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const travelled = useRef(false)

  useLayoutEffect(() => {
    if (!point || travelled.current || !ref.current) return
    travelled.current = true
    if (reducedMotion()) return
    const frames = Array.from({ length: TRAVEL_STEPS + 1 }, (_, i) =>
      place(sunAt((point.t * i) / TRAVEL_STEPS, date, lat)),
    )
    ref.current.animate(frames, { duration: 900, easing: 'cubic-bezier(.22,.8,.2,1)' })
  }, [point, date, lat])

  return (
    <div
      ref={ref}
      className={`${styles.sun} ${point ? '' : styles.set}`}
      style={point ? { ...place(point), opacity: 1 - 0.55 * (cloudCover / 100) } : undefined}
      aria-hidden="true"
    />
  )
}
