import { useId, type KeyboardEvent } from 'react'
import { clockOf } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { formatProb, formatTemp } from '../../text/format'
import { WeatherIcon } from '../WeatherIcon'
import { smoothPath } from './curve'
import marks from './markers.module.css'
import styles from './HourlyStrip.module.css'
import { BAND_H, BAND_TOP, describeHour, layoutStrip, SLOT_W } from './stripLayout'
import type { TimelineSlot } from './timeline'

interface Props {
  slots: TimelineSlot[]
  label: string
  /** 'sky' sits on the gradient; 'sheet' sits on the paper sheet. */
  tone?: 'sky' | 'sheet'
  /** When given, hours can be picked (tap or arrow keys). */
  selected?: LocalTime | null
  onSelect?: (time: LocalTime | null) => void
}

/** Horizontally scrolling hours with a temperature curve; sunrise, sunset and midnight marked. */
export function HourlyStrip({ slots, label, tone = 'sky', selected = null, onSelect }: Props) {
  const gradId = useId()
  if (!slots.some((s) => s.type === 'hour')) return null
  const { hours, width, pts, suns, breaks, hasProb } = layoutStrip(slots)
  const bandTop = hasProb ? BAND_TOP.withProb : BAND_TOP.withoutProb
  const line = smoothPath(pts)
  const area = `${line} L${pts[pts.length - 1].x},${BAND_H} L${pts[0].x},${BAND_H} Z`
  const focusIndex = Math.max(0, hours.findIndex((h) => (selected ? h.time === selected : h.isNow)))

  const onKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const last = hours.length - 1
    // RTL: the left arrow moves later in time; Home/End jump to the first/last hour.
    const target = { ArrowLeft: (at: number) => at + 1, ArrowRight: (at: number) => at - 1, Home: () => 0, End: () => last }[e.key]
    const at = Number((e.target as HTMLElement).dataset.index)
    if (!target || !onSelect || Number.isNaN(at)) return
    const next = Math.min(last, Math.max(0, target(at)))
    e.preventDefault()
    onSelect(hours[next].time)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus()
  }

  return (
    <section className={`${styles.strip} ${styles[tone]}`} aria-label={label} style={{ '--band-top': `${bandTop}px` } as React.CSSProperties}>
      <div className={styles.scroller}>
        <div className={styles.track} style={{ width, height: bandTop + BAND_H }}>
          <svg className={styles.curve} width={width} height={BAND_H} aria-hidden="true">
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--curve)" stopOpacity="0.2" />
                <stop offset="1" stopColor="var(--curve)" stopOpacity="0" />
              </linearGradient>
              {/* Fade the fill out sideways at both ends, so it never stops in a hard vertical edge under a dot. */}
              <linearGradient id={`${gradId}-ends`} gradientUnits="userSpaceOnUse" x1={pts[0].x} x2={pts[pts.length - 1].x} y1="0" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset={Math.min(.5, 28 / width)} stopColor="#fff" />
                <stop offset={Math.max(.5, 1 - 28 / width)} stopColor="#fff" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id={`${gradId}-mask`}>
                <rect x={0} y={0} width={width} height={BAND_H} fill={`url(#${gradId}-ends)`} />
              </mask>
            </defs>
            {tone === 'sky' && <path d={area} fill={`url(#${gradId})`} mask={`url(#${gradId}-mask)`} />}
            <path d={line} className={styles.line} pathLength={1} data-intro="curve" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={hours[i].time === selected ? 4.5 : hours[i].isNow ? 3.6 : 2} className={styles.dot} />
            ))}
          </svg>
          {breaks.map((b) => (
            <span key={b.x} className={marks.break} style={{ left: b.x }} aria-hidden="true">{b.label}</span>
          ))}
          {suns.map((s) => (
            <span key={s.time} className={`${marks.sun} ${tone === 'sky' ? marks.sunSky : ''}`} style={{ left: s.x }} aria-hidden="true">
              {/* The hairline ends in its own name, so the marker explains itself; the sheet's day detail only needs the time. */}
              {tone === 'sheet'
                ? <bdi>{clockOf(s.time)}</bdi>
                : <span className={marks.sunLabel}>{s.rise ? 'זריחה' : 'שקיעה'} <bdi>{clockOf(s.time)}</bdi></span>}
            </span>
          ))}
          <ol className={styles.slots} onKeyDown={onKey}>
            {hours.map((h, i) => {
              const content = (
                <>
                  <span className="visually-hidden">{describeHour(h)}</span>
                  <span className={styles.hour} aria-hidden="true">{h.isNow ? 'עכשיו' : clockOf(h.time).slice(0, 2)}</span>
                  <span aria-hidden="true" className={styles.iconWrap}>
                    <WeatherIcon kind={h.kind} isDay={h.isDay} size={24} className={styles.icon} />
                  </span>
                  {hasProb && <span className={styles.prob} aria-hidden="true">{h.prob !== null ? formatProb(h.prob) : ''}</span>}
                  <span className={styles.temp} aria-hidden="true" style={{ top: `calc(var(--band-top) + ${pts[i].y - 21}px)` }}>
                    <bdi>{formatTemp(h.temp)}</bdi>
                  </span>
                </>
              )
              const cls = `${styles.slot} ${h.isNow ? styles.now : ''} ${h.time === selected ? styles.selected : ''}`
              return (
                <li key={h.time} style={{ width: SLOT_W, '--i': i } as React.CSSProperties} data-intro="label">
                  {onSelect ? (
                    <button
                      type="button"
                      className={cls}
                      data-index={i}
                      tabIndex={i === focusIndex ? 0 : -1}
                      aria-pressed={h.time === selected}
                      onClick={() => onSelect(h.time === selected ? null : h.time)}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={cls}>{content}</div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      {suns.length > 0 && (
        <p className="visually-hidden">
          {suns.map((s) => `${s.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(s.time)}`).join(', ')}
        </p>
      )}
    </section>
  )
}
