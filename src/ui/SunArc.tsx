import { clockOf, daylightFraction } from '../domain/time'
import type { LocalTime } from '../domain/types'
import styles from './SunArc.module.css'

interface Props {
  now: LocalTime
  sunrise: LocalTime
  sunset: LocalTime
}

const W = 300
const H = 70
const R_X = 130
const BASE_Y = 64

/**
 * The sun's path across today's sky. In RTL, time flows from right (sunrise) to left (sunset).
 * At night the marker becomes a moon resting below the horizon line.
 */
export function SunArc({ now, sunrise, sunset }: Props) {
  const frac = daylightFraction(now, sunrise, sunset)
  const up = frac >= 0 && frac <= 1
  const t = Math.min(1, Math.max(0, frac))
  // Parametric half-ellipse, right → left.
  const angle = Math.PI * t
  const x = W / 2 + R_X * Math.cos(angle)
  const y = BASE_Y - (BASE_Y - 8) * Math.sin(angle)
  const arc = `M ${W / 2 + R_X} ${BASE_Y} A ${R_X} ${BASE_Y - 8} 0 0 0 ${W / 2 - R_X} ${BASE_Y}`
  const label = up
    ? `השמש זורחת ב־${clockOf(sunrise)} ושוקעת ב־${clockOf(sunset)}`
    : `זריחה ב־${clockOf(sunrise)}, שקיעה ב־${clockOf(sunset)}`

  return (
    <figure className={styles.arc} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} aria-hidden="true">
        <path d={arc} className={styles.track} />
        {up && <path d={arc} className={styles.done} pathLength={1} strokeDasharray={`${t} 1`} />}
        <line x1="0" x2={W} y1={BASE_Y} y2={BASE_Y} className={styles.horizon} />
        {up ? (
          <circle cx={x} cy={y} r="7" className={styles.sun} />
        ) : (
          <circle cx={W / 2} cy={BASE_Y + 1} r="5" className={styles.moon} />
        )}
      </svg>
      <figcaption className={styles.times} aria-hidden="true">
        <span>זריחה <bdi>{clockOf(sunrise)}</bdi></span>
        <span>שקיעה <bdi>{clockOf(sunset)}</bdi></span>
      </figcaption>
    </figure>
  )
}
