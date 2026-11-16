import { conditionLabel, conditionOf } from '../domain/conditions'
import type { CurrentWeather, DayPoint } from '../domain/types'
import { formatTemp } from '../text/format'
import styles from './Hero.module.css'
import { useCountUp } from './useCountUp'

interface Props {
  current: CurrentWeather
  today: DayPoint | undefined
}

export function Hero({ current, today }: Props) {
  const temp = useCountUp(Math.round(current.temperature))
  const kind = conditionOf(current.weatherCode)
  const feels = Math.round(current.feelsLike)
  const showFeels = Math.abs(feels - Math.round(current.temperature)) >= 2

  return (
    <section className={styles.hero} aria-label="מזג האוויר עכשיו">
      <p className={styles.temp} aria-label={`${Math.round(current.temperature)} מעלות`}>
        <bdi>{formatTemp(temp, false)}</bdi>
        <span className={styles.degree} aria-hidden="true">°</span>
      </p>
      <div className={styles.meta}>
        <p className={styles.condition}>{conditionLabel(kind, current.isDay)}</p>
        {showFeels && (
          <p className={styles.line}>
            מרגיש כמו <bdi>{formatTemp(feels)}</bdi>
          </p>
        )}
        {today && (
          <p className={styles.line}>
            <span aria-label="מקסימום">↑<bdi>{formatTemp(today.tempMax)}</bdi></span>
            <span className={styles.dot} aria-hidden="true">·</span>
            <span aria-label="מינימום">↓<bdi>{formatTemp(today.tempMin)}</bdi></span>
          </p>
        )}
      </div>
    </section>
  )
}
