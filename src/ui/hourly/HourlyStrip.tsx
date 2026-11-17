import { useId } from 'react'
import { clockOf } from '../../domain/time'
import { formatProb, formatTemp } from '../../text/format'
import { conditionLabel } from '../../domain/conditions'
import { WeatherIcon } from '../WeatherIcon'
import { fillGaps, scaleY, smoothPath } from './curve'
import styles from './HourlyStrip.module.css'
import type { TimelineSlot } from './timeline'

interface Props {
  slots: TimelineSlot[]
  label: string
  /** 'sky' sits on the gradient; 'sheet' sits on the paper sheet. */
  tone?: 'sky' | 'sheet'
}

const SLOT_W = 54
const BAND_H = 66
const PAD = 20

function spoken(s: TimelineSlot): string {
  if (s.type === 'sun') return `${s.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(s.time)}`
  const parts = [s.isNow ? 'עכשיו' : clockOf(s.time), conditionLabel(s.kind, s.isDay), formatTemp(s.temp)]
  if (s.prob !== null) parts.push(`סיכוי לגשם ${formatProb(s.prob)}`)
  return parts.join(', ')
}

function hourLabel(s: TimelineSlot): string {
  if (s.type === 'hour' && s.isNow) return 'עכשיו'
  return s.type === 'hour' ? clockOf(s.time).slice(0, 2) : clockOf(s.time)
}

/** Horizontally scrolling hours with a temperature curve; sunrise/sunset marked inline. */
export function HourlyStrip({ slots, label, tone = 'sky' }: Props) {
  const gradId = useId()
  if (!slots.length) return null
  const temps = fillGaps(slots.map((s) => (s.type === 'hour' ? s.temp : null)))
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const width = slots.length * SLOT_W
  // RTL: the first slot sits at the right edge.
  const pts = temps.map((t, i) => ({ x: width - (i + 0.5) * SLOT_W, y: scaleY(t, min, max, BAND_H, PAD) }))
  const line = smoothPath(pts)
  const area = `${line} L${pts[pts.length - 1].x},${BAND_H} L${pts[0].x},${BAND_H} Z`

  return (
    <section className={`${styles.strip} ${styles[tone]}`} aria-label={label}>
      <div className={styles.scroller} tabIndex={0}>
        <div className={styles.track} style={{ width }}>
          <svg className={styles.curve} width={width} height={BAND_H} aria-hidden="true">
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--curve)" stopOpacity="0.22" />
                <stop offset="1" stopColor="var(--curve)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} />
            <path d={line} className={styles.line} />
            {pts.map((p, i) =>
              slots[i].type === 'hour' ? (
                <circle key={i} cx={p.x} cy={p.y} r={slots[i].isNow ? 3.6 : 2} className={styles.dot} />
              ) : null,
            )}
          </svg>
          <ol className={styles.slots}>
            {slots.map((s, i) => (
              <li
                key={s.time + s.type}
                className={`${styles.slot} ${s.type === 'sun' ? styles.sun : ''} ${s.type === 'hour' && s.isNow ? styles.now : ''}`}
                style={{ width: SLOT_W, animationDelay: `${Math.min(i, 12) * 30}ms` }}
              >
                <span className="visually-hidden">{spoken(s)}</span>
                <span className={styles.hour} aria-hidden="true">
                  {s.type === 'sun' ? (s.rise ? 'זריחה' : 'שקיעה') : hourLabel(s)}
                </span>
                {s.type === 'hour' ? (
                  <>
                    <span aria-hidden="true" className={styles.iconWrap}>
                      <WeatherIcon kind={s.kind} isDay={s.isDay} size={24} className={styles.icon} />
                    </span>
                    <span className={styles.prob} aria-hidden="true">{s.prob !== null ? formatProb(s.prob) : ''}</span>
                    <span className={styles.temp} aria-hidden="true" style={{ top: `calc(var(--band-top) + ${pts[i].y - 21}px)` }}>
                      <bdi>{formatTemp(s.temp)}</bdi>
                    </span>
                  </>
                ) : (
                  <>
                    <SunMark rise={s.rise} />
                    <span className={styles.prob} aria-hidden="true"><bdi>{hourLabel(s)}</bdi></span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function SunMark({ rise }: { rise: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} className={styles.icon} aria-hidden="true">
      <path d="M4 17h16" />
      <path d="M7.5 17a4.5 4.5 0 0 1 9 0" />
      <path d={rise ? 'M12 4v5M9.5 6.5 12 4l2.5 2.5' : 'M12 4v5M9.5 6.5 12 9l2.5-2.5'} />
    </svg>
  )
}
