import { THRESHOLDS as T } from '../config/thresholds'
import { conditionLabel, conditionOf } from '../domain/conditions'
import type { CurrentWeather } from '../domain/types'
import { formatTemp } from '../text/format'
import { ltr, tempText } from '../text/isolate'
import styles from './Hero.module.css'
import { useCountUp } from './useCountUp'

const SHOW_GUSTS_FROM = 20

/** Feels-like when it differs noticeably, else notable gusts, else nothing. */
function secondLine(c: CurrentWeather): string | null {
  const feels = Math.round(c.feelsLike)
  if (Math.abs(feels - Math.round(c.temperature)) >= T.feelsLikeDelta) return `מרגיש כמו ${tempText(feels)}`
  if (c.windGusts >= SHOW_GUSTS_FROM) return `משבים עד ${Math.round(c.windGusts)} קמ״ש`
  return null
}

/**
 * Now: one number and at most one supporting fact. The condition is not repeated here: the strip's "עכשיו" slot shows
 * it right below, and the sentence says it in words. Screen readers still hear it with the temperature.
 */
export function Hero({ current }: { current: CurrentWeather }) {
  const temp = useCountUp(Math.round(current.temperature))
  const kind = conditionOf(current.weatherCode)
  const line = secondLine(current)

  return (
    <section className={styles.hero} aria-label="מזג האוויר עכשיו">
      <p className={styles.temp}>
        <span className="visually-hidden">{ltr(formatTemp(current.temperature, false))} מעלות, {conditionLabel(kind, current.isDay)}</span>
        <span className={styles.digits} data-intro="digits" aria-hidden="true">
          {formatTemp(temp, false)}
          <span className={styles.degree}>°</span>
        </span>
      </p>
      {line && <p className={styles.line} data-intro="cond">{line}</p>}
    </section>
  )
}
