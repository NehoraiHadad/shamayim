import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
  const [hasOpened, setHasOpened] = useState(open)
  const itemRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      const item = itemRef.current
      if (item && item.getBoundingClientRect().bottom > window.innerHeight) {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
        item.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
      }
    })
  }, [open])
  const toggle = () => {
    if (!open) setHasOpened(true)
    onToggle()
  }
  const kind = conditionOf(day.weatherCode)
  const prob = day.precipProbMax ?? 0
  const showProb = prob >= T.showRainProb
  const tag = day.lowConfidence ? 'הערכה' : day.confidence === 'low' ? 'עשוי להשתנות' : ''
  const summary = [
    name,
    conditionLabel(kind, true),
    `מקסימום ${formatTemp(day.tempMax)}`,
    `מינימום ${formatTemp(day.tempMin)}`,
    showProb ? `סיכוי לגשם ${formatProb(prob)}` : '',
    tag,
  ].filter(Boolean).join(', ')
  const detailId = `day-${day.date}`

  return (
    <li
      className={`${styles.item} ${isToday ? styles.today : ''} ${open ? styles.open : ''}`}
      style={{ '--i': index } as CSSProperties}
      ref={itemRef}
    >
      <button
        type="button"
        className={styles.row}
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={summary}
        onClick={toggle}
      >
        <span className={styles.name} aria-hidden="true">
          <span className={styles.day}>{name}</span>
          <bdi className={styles.date}>{shortDate(day.date)}</bdi>
          {tag && <span className={styles.tag}>{tag}</span>}
        </span>
        <span className={styles.cond} aria-hidden="true">
          <WeatherIcon kind={kind} size={26} />
          <span className={styles.prob}>{showProb ? formatProb(prob) : ''}</span>
        </span>
        <span className={styles.range} dir="ltr" aria-hidden="true">
          <span className={styles.min}>{formatTemp(day.tempMin)}</span>
          <RangeBar min={day.tempMin} max={day.tempMax} scaleMin={scaleMin} scaleMax={scaleMax}
            now={nowTemp} spreadMin={day.spread.tempMin} spreadMax={day.spread.tempMax} />
          <span className={styles.max}>{formatTemp(day.tempMax)}</span>
        </span>
        <svg className={styles.chevron} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <div id={detailId} className={`${styles.panel} ${open ? styles.panelOpen : ''}`} inert={!open ? true : undefined}>
        <div className={styles.panelInner}><div className={styles.panelContent}>{hasOpened && detail}</div></div>
      </div>
    </li>
  )
}
