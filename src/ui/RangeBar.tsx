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

/** Horizontal min→max bar. Always LTR (cold left, hot right), even inside RTL. */
export function RangeBar({ min, max, scaleMin, scaleMax, now, spreadMin, spreadMax }: Props) {
  const span = Math.max(1, scaleMax - scaleMin)
  const left = ((min - scaleMin) / span) * 100
  const width = Math.max(4, ((max - min) / span) * 100)
  const marker = now === undefined ? null : ((now - scaleMin) / span) * 100
  const lowSpread = (spreadMin / span) * 100
  const highSpread = (spreadMax / span) * 100
  return (
    <div className={styles.track} dir="ltr" aria-hidden="true">
      <div
        className={styles.fill}
        data-intro="bar"
        style={{ left: `${left}%`, width: `${width}%`, backgroundImage: `linear-gradient(90deg, ${rampStops(min, max)})` }}
      />
      <div className={styles.spread} style={{ left: `${left - lowSpread}%`, width: `${lowSpread}%`, background: colorAt(min) }} />
      <div className={styles.spread} style={{ left: `${left + width}%`, width: `${highSpread}%`, background: colorAt(max) }} />
      {marker !== null && <div className={styles.now} style={{ left: `${Math.min(100, Math.max(0, marker))}%` }} />}
    </div>
  )
}
