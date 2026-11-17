import type { CSSProperties } from 'react'
import type { WearTip } from '../../text/wear'
import { GARMENTS } from './garments'
import styles from './WearLine.module.css'

const W = 335
const H = 62
const END_Y = 7
const SAG = 16
const STEP = 58

/** Height of the sagging line at x (a quadratic from end to end, deepest in the middle). */
const lineY = (x: number) => END_Y + 4 * SAG * (x / W) * (1 - x / W)

/** Today's clothes pegged on a line strung across the card, in the order the sentence names them (RTL: first on the
 *  right). A line, not a row of icons: it sags, the clothes tilt with it. Decorative; the sentence carries the words. */
export function WearLine({ garments, wind }: Pick<WearTip, 'garments' | 'wind'>) {
  const n = garments.length
  // Still below ~8 km/h; by ~38 km/h the clothes stand out at 24° downwind and flap faster.
  const blow = Math.min(1, Math.max(0, (wind.speed - 8) / 30))
  const lean = 24 * blow * wind.drift
  const air = { '--sway-dur': `${(7 - 4.5 * blow).toFixed(1)}s`, '--sway-amp': `${(1.2 + 3 * blow).toFixed(1)}deg` } as CSSProperties
  const first = W / 2 + ((n - 1) * STEP) / 2
  return (
    <svg className={styles.line} viewBox={`0 0 ${W} ${H}`} style={air} aria-hidden="true">
      <path className={styles.rope} d={`M0 ${END_Y}Q${W / 2} ${END_Y + 2 * SAG} ${W} ${END_Y}`} />
      {garments.map((g, i) => {
        const x = first - i * STEP
        const y = lineY(x)
        const tilt = (Math.atan((4 * SAG * (1 - (2 * x) / W)) / W) * 180) / Math.PI
        const item = GARMENTS[g]
        // Pegged cloth keeps its top on the line and its hem blows out (skew); hooked things swing (rotate).
        const blown = item.hook ? `rotate(${(-lean).toFixed(1)})` : `skewX(${lean.toFixed(1)})`
        return (
          <g key={g} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(tilt * 0.6).toFixed(1)}) ${blown}`}>
            <g className={styles.item} style={{ animationDelay: `${-i * 0.7}s`, '--cloth': item.cloth } as CSSProperties}>
              {item.body}
              {item.pegs.map((px) => <rect key={px} className={styles.peg} x={px - 1.3} y={-3.2} width={2.6} height={6.4} rx={0.8} />)}
            </g>
          </g>
        )
      })}
    </svg>
  )
}
