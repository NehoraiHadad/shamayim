import { THRESHOLDS as T } from '../config/thresholds'
import { conditionLabel, conditionOf } from '../domain/conditions'
import type { CurrentWeather } from '../domain/types'
import { formatTemp } from '../text/format'
import styles from './Hero.module.css'
import { useCountUp } from './useCountUp'
import { WeatherIcon } from './WeatherIcon'

const SHOW_GUSTS_FROM = 20

/** Feels-like when it differs noticeably, else notable gusts, else nothing. */
function secondLine(c: CurrentWeather): string | null {
  const feels = Math.round(c.feelsLike)
  if (Math.abs(feels - Math.round(c.temperature)) >= T.feelsLikeDelta) return `מרגיש כמו ${formatTemp(feels)}`
  if (c.windGusts >= SHOW_GUSTS_FROM) return `משבים עד ${Math.round(c.windGusts)} קמ״ש`
  return null
}

/** Now: one number, one icon, one condition, and at most one supporting fact. */
export function Hero({ current }: { current: CurrentWeather }) {
  const temp = useCountUp(Math.round(current.temperature))
  const kind = conditionOf(current.weatherCode)
  const line = secondLine(current)

  return (
    <section className={styles.hero} aria-label="מזג האוויר עכשיו">
      <p className={styles.temp}>
        <span className="visually-hidden">{Math.round(current.temperature)} מעלות</span>
        <span className={styles.digits} data-intro="digits" aria-hidden="true">
          {formatTemp(temp, false)}
          <span className={styles.degree}>°</span>
        </span>
      </p>
      <div className={styles.meta} data-intro="cond">
        <WeatherIcon kind={kind} isDay={current.isDay} size={40} className={styles.icon} decorative />
        <p className={styles.condition}>{conditionLabel(kind, current.isDay)}</p>
        {line && <p className={styles.line}>{line}</p>}
      </div>
    </section>
  )
}
