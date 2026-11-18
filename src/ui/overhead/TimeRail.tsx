import type { CSSProperties } from 'react'
import { RADAR_WASH } from './recolor'
import styles from './TimeRail.module.css'

export function TimeRail({ at, count, age, reduced, choose }: {
  at: number
  count: number
  age: string
  reduced: boolean
  choose: (at: number) => void
}) {
  const last = count - 1
  return (
    <div className={styles.time}>
      {reduced && last > 0 && <button type="button" disabled={at === 0} aria-label="תמונה קודמת"
        onClick={() => choose(at - 1)}><span aria-hidden="true">›</span></button>}
      <output className={styles.age} aria-live="off">{age}</output>
      {reduced && last > 0 && <button type="button" disabled={at === last} aria-label="תמונה הבאה"
        onClick={() => choose(at + 1)}><span aria-hidden="true">‹</span></button>}
      {!reduced && last > 0 && (
        <div className={styles.rail} style={{ '--step': `${100 / last}%` } as CSSProperties}>
          <input type="range" min={0} max={last} value={at} dir="rtl" aria-label="זמן תמונת המכ״ם"
            aria-valuetext={age} onPointerDown={() => choose(at)}
            onChange={(event) => choose(event.currentTarget.valueAsNumber)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              choose(Math.max(0, Math.min(last, at + (event.key === 'ArrowLeft' ? 1 : -1))))
            }} />
        </div>
      )}
    </div>
  )
}

export function RainLegend({ clear, stale }: { clear: boolean; stale: boolean }) {
  if (clear) return <span>אין גשם במכ״ם</span>
  const labels = ['קל', 'בינוני', 'חזק']
  return (
    <span className={styles.legend}>
      {RADAR_WASH.map(([r, g, b, opacity], index) => (
        <span key={labels[index]}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          <i aria-hidden="true" style={{ background: `rgb(${r} ${g} ${b} / ${opacity})`,
            filter: stale ? 'grayscale(1)' : undefined }} />{labels[index]}
        </span>
      ))}
    </span>
  )
}
