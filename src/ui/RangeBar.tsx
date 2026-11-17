import { mix } from '../theme/contrast'
import styles from './RangeBar.module.css'

interface Props {
  min: number
  max: number
  /** Shared scale across the whole week so bars are comparable. */
  scaleMin: number
  scaleMax: number
  /** Current temperature marker (today only). */
  now?: number
  spreadMin: number
  spreadMax: number
}

/** Fixed absolute colour ramp in the sky's own colours (night indigo, clear-day blue, horizon sand, heat rust):
 *  the same temperature is always the same colour, so a 26° day and a 29° day visibly differ. */
const RAMP: [number, string][] = [
  [0, '#3E4F96'],
  [10, '#2A74B8'],
  [17, '#7FA2BC'],
  [22, '#CDAE7C'],
  [28, '#D08A3A'],
  [34, '#A84F1C'],
  [42, '#7E2A10'],
]

function rampStops(from: number, to: number): string {
  const span = Math.max(1, to - from)
  const inside = RAMP.filter(([t]) => t > from && t < to)
  const pts: [number, string][] = [[from, colorAt(from)], ...inside, [to, colorAt(to)]]
  return pts.map(([t, c]) => `${c} ${(((t - from) / span) * 100).toFixed(1)}%`).join(', ')
}

/** The ramp colour at t, blended between its two nearest stops. */
function colorAt(t: number): string {
  const next = RAMP.findIndex(([stop]) => stop > t)
  if (next === 0) return RAMP[0][1]
  if (next < 0) return RAMP[RAMP.length - 1][1]
  const [[t0, c0], [t1, c1]] = [RAMP[next - 1], RAMP[next]]
  return mix(c0, c1, (t - t0) / (t1 - t0))
}

const clampPct = (v: number) => Math.min(100, Math.max(0, v))

/** Horizontal min→max bar. Always LTR (cold left, hot right), even inside RTL. */
export function RangeBar({ min, max, scaleMin, scaleMax, now, spreadMin, spreadMax }: Props) {
  const span = Math.max(1, scaleMax - scaleMin)
  const left = ((min - scaleMin) / span) * 100
  const width = Math.min(100 - left, Math.max(4, ((max - min) / span) * 100))
  const marker = now === undefined ? null : ((now - scaleMin) / span) * 100
  // The model spread reaches past each end of the bar, clamped inside the track.
  const spreadFrom = clampPct(left - (spreadMin / span) * 100)
  const spreadTo = clampPct(left + width + (spreadMax / span) * 100)
  return (
    <div className={styles.track} dir="ltr" aria-hidden="true">
      {spreadTo - spreadFrom > width && (
        <div
          className={styles.spread}
          style={{
            left: `${spreadFrom}%`,
            width: `${spreadTo - spreadFrom}%`,
            backgroundImage: `linear-gradient(90deg, ${rampStops(min - spreadMin, max + spreadMax)})`,
          }}
        />
      )}
      <div
        className={styles.fill}
        data-intro="bar"
        style={{ left: `${left}%`, width: `${width}%`, backgroundImage: `linear-gradient(90deg, ${rampStops(min, max)})` }}
      />
      {marker !== null && <div className={styles.now} style={{ left: `${clampPct(marker)}%` }} />}
    </div>
  )
}
