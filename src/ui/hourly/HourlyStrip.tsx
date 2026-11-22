import { useId, type KeyboardEvent } from 'react'
import { clockOf, hourOf } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { formatProb, formatTemp } from '../../text/format'
import { ltr } from '../../text/isolate'
import { keyStep } from '../scrub/keyStep'
import { WeatherIcon } from '../WeatherIcon'
import { smoothPath } from './curve'
import marks from './markers.module.css'
import styles from './HourlyStrip.module.css'
import { NextSunTag } from './NextSunTag'
import { useNextSunTag } from './useNextSunTag'
import { BAND_H, BAND_TOP, describeHour, layoutStrip, SLOT_W } from './stripLayout'
import type { TimelineSlot } from './timeline'
import { useStripScrub } from './useStripScrub'

interface Props {
  slots: TimelineSlot[]
  label: string
  /** 'sky' sits on the gradient; 'sheet' sits on the paper sheet. */
  tone?: 'sky' | 'sheet'
  /** When given, hours can be picked (tap or arrow keys). */
  selected?: LocalTime | null
  onSelect?: (time: LocalTime | null) => void
  onScrub?: (time: LocalTime) => void
  onRelease?: () => void
  scrubbing?: boolean
}

/** Horizontally scrolling hours with a temperature curve; sunrise, sunset and midnight marked. */
export function HourlyStrip({ slots, label, tone = 'sky', selected = null, onSelect, onScrub, onRelease, scrubbing = false }: Props) {
  const gradId = useId()
  const [scrollerRef, away, bringNextSun] = useNextSunTag(tone === 'sky', slots)
  const selectedHour = selected?.slice(0, 13)
  const firstHour = slots.find((s) => s.type === 'hour')
  const pointer = useStripScrub({ scrollerRef, slots, shownHour: selectedHour, scrubbing, first: firstHour?.time,
    width: slots.filter((s) => s.type === 'hour').length * SLOT_W, onScrub, onRelease })
  if (!firstHour) return null
  const { hours, width, pts, suns, breaks, hasProb } = layoutStrip(slots)
  const bandTop = hasProb ? BAND_TOP.withProb : BAND_TOP.withoutProb
  const line = smoothPath(pts)
  const area = `${line} L${pts[pts.length - 1].x},${BAND_H} L${pts[0].x},${BAND_H} Z`
  const focusIndex = Math.max(0, hours.findIndex((h) => (selected ? h.time.slice(0, 13) === selectedHour : h.isNow)))
  const onKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const at = Number((e.target as HTMLElement).dataset.index)
    if (!onSelect || Number.isNaN(at)) return
    const next = keyStep(e.key, at, 0, hours.length - 1)
    if (next === null) return
    e.preventDefault()
    onSelect(hours[next].time)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus()
  }

  return (
    <section className={`${styles.strip} ${styles[tone]}`} aria-label={label} style={{ '--band-top': `${bandTop}px`, '--band-h': `${BAND_H}px` } as React.CSSProperties}>
      <div className={styles.scroller} ref={scrollerRef}>
        <div className={styles.track} style={{ width, height: bandTop + BAND_H }} {...pointer}>
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
              <circle key={i} cx={p.x} cy={p.y} r={hours[i].time.slice(0, 13) === selectedHour ? 4.5 : hours[i].isNow ? 3.6 : 2} className={styles.dot} />
            ))}
          </svg>
          {breaks.map((b) => (
            <span key={b.x} className={marks.break} style={{ left: b.x }} aria-hidden="true">{b.label}</span>
          ))}
          {suns.map((s, i) => (
            <span key={s.time} data-sun className={`${marks.sun} ${tone === 'sky' ? marks.sunSky : ''}`} style={{ left: s.x }} aria-hidden="true">
              {/* The hairline ends in its own name, so the marker explains itself; the sheet's day detail only needs the time. */}
              {tone === 'sheet'
                ? <bdi>{clockOf(s.time)}</bdi>
                // While the edge tag stands in for this marker, its own chip (half out of view) would print twice.
                : <span className={`${marks.chip} ${marks.sunLabel}`} style={i === 0 && away ? { visibility: 'hidden' } : undefined}>{s.rise ? 'זריחה' : 'שקיעה'} <bdi>{clockOf(s.time)}</bdi></span>}
            </span>
          ))}
          <ol className={styles.slots} onKeyDown={onKey}>
            {hours.map((h, i) => {
              // An icon that only repeats the hour before is dimmed, so a change of weather is what stands out.
              // "Now" and the first hour of a new day always show in full, to keep their context.
              const prev = hours[i - 1]
              const repeat = Boolean(prev) && !h.isNow && hourOf(h.time) !== 0 && prev.kind === h.kind && prev.isDay === h.isDay
              const content = (
                <>
                  <span className="visually-hidden">{describeHour(h)}</span>
                  <span className={styles.hour} aria-hidden="true">{h.isNow ? 'עכשיו' : clockOf(h.time).slice(0, 2)}</span>
                  <span aria-hidden="true" className={`${styles.iconWrap} ${repeat ? styles.repeat : ''}`}>
                    <WeatherIcon kind={h.kind} isDay={h.isDay} size={24} className={styles.icon} />
                  </span>
                  {hasProb && <span className={styles.prob} aria-hidden="true">{h.prob !== null ? formatProb(h.prob) : ''}</span>}
                  <span className={styles.temp} aria-hidden="true" style={{ top: `calc(var(--band-top) + ${pts[i].y - 21}px)` }}>
                    <bdi>{formatTemp(h.temp)}</bdi>
                  </span>
                </>
              )
              const picked = h.time.slice(0, 13) === selectedHour
              const cls = `${styles.slot} ${h.isNow ? styles.now : ''} ${picked ? styles.selected : ''}`
              return (
                <li key={h.time} style={{ width: SLOT_W, '--i': i } as React.CSSProperties} data-intro="label">
                  {onSelect ? (
                    <button
                      type="button"
                      className={cls}
                      data-index={i}
                      tabIndex={i === focusIndex ? 0 : -1}
                      aria-pressed={picked}
                      onClick={() => onSelect(picked ? null : h.time)}
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
      {away && suns[0] && <NextSunTag sun={suns[0]} away={away} onClick={bringNextSun} />}
      {suns.length > 0 && (
        <p className="visually-hidden">
          {suns.map((s) => `${s.rise ? 'זריחה' : 'שקיעה'} ב־${ltr(clockOf(s.time))}`).join(', ')}
        </p>
      )}
    </section>
  )
}
