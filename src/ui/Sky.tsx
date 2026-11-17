import { useMemo, type ReactNode } from 'react'
import styles from './Sky.module.css'

interface Props {
  altitude: number
  /** 0–100; cloud hides stars. */
  cloudCover: number
  /** The live air, drawn over the gradient and stars. */
  children?: ReactNode
}

/** Deterministic star field as one box-shadow list (cheap: a single element). Kept clear of the text column. */
function starField(count: number): string {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: count }, () => {
    const x = Math.round(rand() * 100)
    const y = Math.round(rand() * 50)
    const nearText = x > 30 && y > 8 && y < 40
    const a = ((0.35 + rand() * 0.65) * (nearText ? 0.4 : 1)).toFixed(2)
    return `${x}vw ${y}svh 0 rgba(255,255,255,${a})`
  }).join(',')
}

/** The sky behind everything: the theme gradient, stars (hidden by cloud), then the air. */
export function Sky({ altitude, cloudCover, children }: Props) {
  const stars = useMemo(() => starField(46), [])
  const starOpacity = Math.min(1, Math.max(0, (-altitude - 4) / 8)) * (1 - 0.9 * (cloudCover / 100))
  return (
    <div className={styles.sky} data-sky aria-hidden="true">
      <div className={styles.stars} style={{ boxShadow: stars, opacity: starOpacity }} />
      {children}
    </div>
  )
}
