import { THRESHOLDS as T } from '../config/thresholds'
import { conditionLabel, conditionOf } from '../domain/conditions'
import { sameLocalHour } from '../domain/now'
import { clockOf, datePart, shortDate } from '../domain/time'
import type { CurrentWeather, LocalTime } from '../domain/types'
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
 * The temperature with its time when the latest available value comes from a different hour.
 */
export function Hero({ current, now }: { current: CurrentWeather; now: LocalTime }) {
  const temp = useCountUp(Math.round(current.temperature))
  const kind = conditionOf(current.weatherCode)
  const line = secondLine(current)
  const isNow = sameLocalHour(current.time, now)
  const date = datePart(current.time)
  const day = date.slice(0, 4) === now.slice(0, 4) ? shortDate(date) : `${shortDate(date)}.${date.slice(0, 4)}`

  return (
    <section className={styles.hero} aria-label={isNow ? 'מזג האוויר עכשיו' : 'נתוני מזג אוויר שמורים'}>
      {isNow ? <span className={styles.now} aria-hidden="true">עכשיו</span> : (
        <span className={styles.now}>
          {current.time < now ? 'נתון אחרון' : 'תחזית שמורה'} מ־<time dateTime={current.time}><bdi>{day}</bdi> ב־<bdi>{clockOf(current.time)}</bdi></time>
        </span>
      )}
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
