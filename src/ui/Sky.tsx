import { useMemo, type ReactNode } from 'react'
import { STAR_CLASSES, starField, starShare } from './starField'
import styles from './Sky.module.css'

interface Props {
  altitude: number
  /** 0–100; cloud hides stars. */
  cloudCover: number
  /** The CSS star field (off when the canvas scene draws the sky, `?canvas=1`). */
  stars?: boolean
  /** The live air, drawn over the gradient and stars. */
  children?: ReactNode
}

/** The sky behind everything: the theme gradient, stars (bright ones first, hidden by cloud), then the air. */
export function Sky({ altitude, cloudCover, stars = true, children }: Props) {
  const fields = useMemo(() => STAR_CLASSES.map((c, i) => starField(7 + i * 977, c.count, c.alpha)), [])
  const clear = 1 - 0.9 * (cloudCover / 100)
  return (
    <div className={styles.sky} data-sky aria-hidden="true">
      {stars && STAR_CLASSES.map((c, i) => (
        <div key={i} className={styles.stars} style={{ boxShadow: fields[i], opacity: starShare(altitude, c) * clear }} />
      ))}
      {children}
    </div>
  )
}
