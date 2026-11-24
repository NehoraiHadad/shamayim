import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { THRESHOLDS as T } from '../config/thresholds'
import { conditionLabel } from '../domain/conditions'
import type { DayPoint } from '../domain/types'
import { formatProb, formatTemp, shortDate } from '../text/format'
import { tempText } from '../text/isolate'
import styles from './DayRow.module.css'
import { RangeBar } from './RangeBar'
import type { DaySky } from './week/middaySky'
import { SkyWindow } from './week/SkyWindow'

interface Props {
  day: DayPoint
  /** The day's midday sky, for its window. */
  sky: DaySky
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

export function DayRow({ day, sky, name, index, scaleMin, scaleMax, isToday, nowTemp, open, onToggle, detail }: Props) {
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
  const kind = sky.kind
  const prob = day.precipProbMax ?? 0
  const showProb = prob >= T.showRainProb
  const tag = day.lowConfidence ? 'הערכה' : day.confidence === 'low' ? 'עשוי להשתנות' : ''
  const summary = [
    name,
    conditionLabel(kind, true),
    sky.hazy ? 'אובך' : '',
    `מקסימום ${tempText(day.tempMax)}`,
    `מינימום ${tempText(day.tempMin)}`,
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
          <span className={styles.date}>
            <bdi>{shortDate(day.date)}</bdi>
            {showProb && <span className={styles.prob}> · {kind === 'snow' ? 'שלג' : 'גשם'}{' '}{formatProb(prob)}</span>}
            {tag && <> · {tag}</>}
          </span>
        </span>
        <span className={styles.cond}>
          <SkyWindow sky={sky} />
        </span>
        <span className={styles.range} dir="ltr" aria-hidden="true">
          <span className={styles.min}>{formatTemp(day.tempMin)}</span>
          <RangeBar min={day.tempMin} max={day.tempMax} scaleMin={scaleMin} scaleMax={scaleMax}
            now={nowTemp} spreadMin={day.spread.tempMin} spreadMax={day.spread.tempMax} />
          <span className={styles.max}>{formatTemp(day.tempMax)}</span>
        </span>
      </button>
      <div id={detailId} className={`${styles.panel} ${open ? styles.panelOpen : ''}`} inert={!open ? true : undefined}>
        <div className={styles.panelInner}><div className={styles.panelContent}>{hasOpened && detail}</div></div>
      </div>
    </li>
  )
}
