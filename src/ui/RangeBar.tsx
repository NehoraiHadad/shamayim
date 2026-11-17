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

/** Fixed absolute colour ramp: the same temperature is always the same colour. */
const RAMP: [number, string][] = [
  [0, '#6C8CF0'],
  [10, '#4FA3E3'],
  [18, '#7CC9B5'],
  [25, '#F2C14E'],
  [32, '#F08A3C'],
  [38, '#E4572E'],
  [45, '#9B1D20'],
]

function rampStops(from: number, to: number): string {
  const span = Math.max(1, to - from)
  const inside = RAMP.filter(([t]) => t > from && t < to)
  const pts: [number, string][] = [[from, colorAt(from)], ...inside, [to, colorAt(to)]]
  return pts.map(([t, c]) => `${c} ${(((t - from) / span) * 100).toFixed(1)}%`).join(', ')
}

function colorAt(t: number): string {
  let pick = RAMP[0][1]
  for (const [stop, c] of RAMP) if (t >= stop) pick = c
  return pick
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
        <div className={styles.spread} style={{ left: `${spreadFrom}%`, width: `${spreadTo - spreadFrom}%` }} />
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
