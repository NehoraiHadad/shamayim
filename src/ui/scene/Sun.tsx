import { useLayoutEffect, useRef } from 'react'
import type { DiscLook } from './sceneLight'
import type { SunPoint } from './sunPath'
import styles from './ValleyScene.module.css'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const TRAVEL_STEPS = 12

function place(p: SunPoint) {
  return { left: `${(p.x * 100).toFixed(2)}%`, top: `${p.y.toFixed(1)}px` }
}

interface Props {
  point: SunPoint | null
  /** Today's path by daylight fraction, for the entry travel from sunrise to where the sun is now. */
  travel: ((t: number) => SunPoint) | null
  /** 0–100; clouds veil the disc. */
  cloudCover: number
  /** 0–1; dust flattens the sun into a pale coin with no halo. */
  coin?: number
  /** Lit scene: the disc drawn from the true sun (air-mass colour, limb darkening, refraction squash). */
  look?: DiscLook
}

/** The physical disc's paint: hot core to a darker, redder limb, squashed by refraction; the halo takes its colour. */
const discStyle = (look: DiscLook) => {
  const a = (alpha: number) => `color-mix(in srgb, ${look.halo} ${Math.round(Math.min(90, alpha * look.aureole))}%, transparent)`
  return {
    background: `radial-gradient(circle, ${look.core} 0%, ${look.core} 42%, ${look.limb} 100%)`,
    transform: `scaleY(${look.flatten.toFixed(3)})`,
    // No hard ring: the aureole (forward scattering off aerosol) falls off smoothly from the limb outward.
    boxShadow: `0 0 6px 1px ${a(55)}, 0 0 22px 6px ${a(28)}, 0 0 48px 14px ${a(12)}`,
    '--accent': look.halo,
  }
}

/** The sun disc. On first appearance it travels up from behind the Gilead to where it is now. */
export function Sun({ point, travel, cloudCover, coin = 0, look }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const travelled = useRef(false)

  useLayoutEffect(() => {
    if (!point || !travel || travelled.current || !ref.current) return
    travelled.current = true
    if (reducedMotion()) return
    const frames = Array.from({ length: TRAVEL_STEPS + 1 }, (_, i) =>
      place(travel((point.t * i) / TRAVEL_STEPS)),
    )
    ref.current.animate(frames, { duration: 900, easing: 'cubic-bezier(.22,.8,.2,1)' })
  }, [point, travel])

  return (
    <div
      ref={ref}
      className={`${styles.sun} ${point ? '' : styles.set}`}
      style={point ? ({ ...place(point), opacity: Math.max(0.12, 1 - 0.85 * (cloudCover / 100) ** 1.5 - 0.4 * coin), '--coin': coin,
        ...(look && coin < .5 ? discStyle(look) : {}) } as React.CSSProperties) : undefined}
      data-sun={point ? 'up' : 'down'}
      aria-hidden="true"
    />
  )
}
