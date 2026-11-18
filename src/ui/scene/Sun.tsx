import { useLayoutEffect, useRef } from 'react'
import type { Skyline } from './skyline'
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
  /** The ridge line the sun rises from. */
  skyline: Skyline
  /** 0–100; clouds veil the disc. */
  cloudCover: number
  /** 0–1; dust flattens the sun into a pale coin with no halo. */
  coin?: number
}

/** The sun disc. On first appearance it travels up from behind the Gilead to where it is now. */
export function Sun({ point, date, lat, skyline, cloudCover, coin = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const travelled = useRef(false)

  useLayoutEffect(() => {
    if (!point || travelled.current || !ref.current) return
    travelled.current = true
    if (reducedMotion()) return
    const frames = Array.from({ length: TRAVEL_STEPS + 1 }, (_, i) =>
      place(sunAt((point.t * i) / TRAVEL_STEPS, date, lat, skyline)),
    )
    ref.current.animate(frames, { duration: 900, easing: 'cubic-bezier(.22,.8,.2,1)' })
  }, [point, date, lat, skyline])

  return (
    <div
      ref={ref}
      className={`${styles.sun} ${point ? '' : styles.set}`}
      style={point ? ({ ...place(point), opacity: Math.max(0.12, 1 - 0.85 * (cloudCover / 100) ** 1.5 - 0.4 * coin), '--coin': coin } as React.CSSProperties) : undefined}
      data-sun={point ? 'up' : 'down'}
      aria-hidden="true"
    />
  )
}
