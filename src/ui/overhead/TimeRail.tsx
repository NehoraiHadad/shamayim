import type { CSSProperties } from 'react'
import styles from './TimeRail.module.css'

export interface FrameTime {
  /** The place's clock at the frame ("14:40"). */
  clock: string
  /** Its age, short ("לפני 20 דק׳") and spelled out for screen readers ("לפני 20 דקות"). */
  ago: string
  spoken: string
}

/**
 * The radar movie's controls: the frame's clock first (what people check against the wall), its age second; a rail
 * from two hours ago (right, the reading start) to now (left); one play/pause button for everyone.
 */
export function TimeRail({ at, count, time, start, playing, toggle, choose }: {
  at: number
  count: number
  time: FrameTime | null
  /** The oldest frame's age, for the rail's start label. */
  start: string
  playing: boolean
  toggle: () => void
  choose: (at: number) => void
}) {
  const last = count - 1
  const rail = { '--step': `${100 / Math.max(1, last)}%`, '--played': `${(at / Math.max(1, last)) * 100}%` } as CSSProperties
  return (
    <div className={styles.time}>
      <output className={styles.readout} aria-live="off">
        {time ? <><span className={styles.clock}>{time.clock}</span><span className={styles.ago}> · {time.ago}</span></> : '—'}
      </output>
      {last > 0 && (
        <div className={styles.controls}>
          <button type="button" className={styles.play} onClick={toggle}
            aria-label={playing ? 'עצירה' : 'הפעלת השעתיים האחרונות'}>
            <span aria-hidden="true">{playing ? '❚❚' : '▶︎'}</span>
          </button>
          <div className={styles.rail} style={rail}>
            <input type="range" min={0} max={last} value={at} dir="rtl" aria-label="זמן התמונה"
              aria-valuetext={time ? `${time.clock}, ${time.spoken}` : undefined}
              onPointerDown={() => choose(at)}
              onChange={(event) => choose(event.currentTarget.valueAsNumber)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                event.preventDefault()
                choose(Math.max(0, Math.min(last, at + (event.key === 'ArrowLeft' ? 1 : -1))))
              }} />
            <div className={styles.ends} aria-hidden="true"><span>{start}</span><span>עכשיו</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RainLegend({ clear, stale, clouds }: { clear: boolean; stale: boolean; clouds: boolean }) {
  const rain = clear ? [] : RAIN_STEPS
  return (
    <ul className={styles.legend} data-stale={stale || undefined}>
      {clouds && <li><i aria-hidden="true" className={styles.cloud} />עננים</li>}
      {clear ? <li>אין גשם במכ״ם באזור המפה</li> : rain.map((label, index) => (
        <li key={label}><i aria-hidden="true" style={{ background: `var(--rain-${index + 1})` }} />{label}</li>
      ))}
    </ul>
  )
}

const RAIN_STEPS = ['גשם קל', 'בינוני', 'חזק']
