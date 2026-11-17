import type { ReactNode } from 'react'
import { THRESHOLDS as T } from '../config/thresholds'
import { conditionLabel, conditionOf } from '../domain/conditions'
import type { DayPoint } from '../domain/types'
import { formatProb, formatTemp, shortDate } from '../text/format'
import styles from './DayRow.module.css'
import { RangeBar } from './RangeBar'
import { WeatherIcon } from './WeatherIcon'

interface Props {
  day: DayPoint
  name: string
  index: number
  scaleMin: number
  scaleMax: number
  isToday: boolean
  nowTemp?: number
  open: boolean
  onToggle: () => void
  /** Rendered under the row while open. */
  detail: ReactNode
}

export function DayRow({ day, name, index, scaleMin, scaleMax, isToday, nowTemp, open, onToggle, detail }: Props) {
  const kind = conditionOf(day.weatherCode)
  const prob = day.precipProbMax ?? 0
  const showProb = prob >= T.showRainProb
  const uncertain = day.lowConfidence || day.confidence === 'low'
  const summary = [
    name,
    conditionLabel(kind, true),
    `מקסימום ${formatTemp(day.tempMax)}`,
    `מינימום ${formatTemp(day.tempMin)}`,
    showProb ? `סיכוי לגשם ${formatProb(prob)}` : '',
    uncertain ? 'תחזית פחות ודאית' : '',
  ].filter(Boolean).join(', ')
  const detailId = `day-${day.date}`

  return (
    <li
      className={`${styles.item} ${isToday ? styles.today : ''} ${open ? styles.open : ''}`}
      style={{ animationDelay: `${120 + index * 45}ms` }}
    >
      <button
        type="button"
        className={`${styles.row} ${day.lowConfidence ? styles.trend : ''}`}
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={summary}
        onClick={onToggle}
      >
        <span className={styles.name} aria-hidden="true">
          <span className={styles.day}>{name}</span>
          <span className={styles.date}>
            {uncertain ? <span className={styles.tag}>{day.lowConfidence ? 'מגמה' : 'לא ודאי'}</span> : <bdi>{shortDate(day.date)}</bdi>}
          </span>
        </span>
        <span className={styles.cond} aria-hidden="true">
          <WeatherIcon kind={kind} size={26} />
          <span className={styles.prob}>{showProb ? formatProb(prob) : ''}</span>
        </span>
        <span className={styles.range} dir="ltr" aria-hidden="true">
          <span className={styles.min}>{formatTemp(day.tempMin)}</span>
          <RangeBar min={day.tempMin} max={day.tempMax} scaleMin={scaleMin} scaleMax={scaleMax} now={nowTemp} />
          <span className={styles.max}>{formatTemp(day.tempMax)}</span>
        </span>
        <svg className={styles.chevron} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <div id={detailId} className={styles.panel} hidden={!open}>
        {open && detail}
      </div>
    </li>
  )
}
