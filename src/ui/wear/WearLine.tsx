import type { CSSProperties } from 'react'
import type { WearTip } from '../../text/wear'
import { GARMENTS } from './garments'
import { GUST, blowOf, rope, smil } from './gust'
import styles from './WearLine.module.css'

const W = 335
const H = 82
/** The rope is tied to the paper's bank (y −3, where the bank meets the gutters), to two ground tabs at the gutters. */
const END_Y = -3
const SAG = 22
const STEP = 70
/** Garments are drawn ~34 px wide; on a full-width line they read best a third larger. */
const SCALE = 1.3

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Today's clothes pegged on a line strung across the card, in the order the sentence names them (RTL: first on the
 *  right). It sags, the clothes tilt with it and stand out downwind; gusts lift the line and flap the hems from the
 *  pegs, rain gear drips. Decorative; the sentence carries the words. */
export function WearLine({ garments, wind }: Pick<WearTip, 'garments' | 'wind'>) {
  const n = garments.length
  const blow = blowOf(wind.speed)
  const lean = 24 * blow * wind.drift
  const dur = `${(7 - 4.5 * blow).toFixed(1)}s`
  // Calm days still drift a little; in wind the hems flap out (in the downwind direction) and the line lifts.
  const air = { '--sway-dur': dur, '--sway-amp': `${((1.5 + 9 * blow) * (wind.drift || 1)).toFixed(1)}deg` } as CSSProperties
  const lift = 1 + 6 * blow
  const still = reducedMotion()
  const sags = GUST.map((g) => SAG - lift * g)
  const line = rope(W, END_Y, SAG)
  const first = W / 2 + ((n - 1) * STEP) / 2
  return (
    <svg className={styles.line} viewBox={`0 0 ${W} ${H}`} style={air} aria-hidden="true">
      <rect className={styles.cleat} x={-3} y={-4} width={6} height={5} rx={1} />
      <rect className={styles.cleat} x={W - 3} y={-4} width={6} height={5} rx={1} />
      <path className={styles.rope} d={line.d}>
        {!still && <animate attributeName="d" {...smil(dur, sags.map((s) => rope(W, END_Y, s).d))} />}
      </path>
      {garments.map((g, i) => {
        const x = first - i * STEP
        const shape = 4 * (x / W) * (1 - x / W) // how much of the sag this point of the line carries
        const tilt = (Math.atan((4 * SAG * (1 - (2 * x) / W)) / W) * 180) / Math.PI
        const item = GARMENTS[g]
        // Pegged cloth keeps its top on the line and its hem blows out (skew); hooked things swing (rotate).
        const blown = item.hook ? `rotate(${(-lean).toFixed(1)})` : `skewX(${lean.toFixed(1)})`
        return (
          <g key={g}>
            {!still && <animateTransform attributeName="transform" type="translate" {...smil(dur, sags.map((s) => `0 ${((s - SAG) * shape).toFixed(2)}`))} />}
            <g transform={`translate(${x.toFixed(1)} ${line.y(x).toFixed(1)}) rotate(${(tilt * 0.6).toFixed(1)}) scale(${SCALE})`}>
              <g transform={blown}>
                <g className={styles.item} data-hook={item.hook || undefined} style={{ animationDelay: `${(-0.22 * i).toFixed(2)}s`, '--cloth': item.cloth } as CSSProperties}>
                  {item.body}
                  {item.pegs.map((px) => <rect key={px} className={styles.peg} x={px - 1.3} y={-3.2} width={2.6} height={6.4} rx={0.8} />)}
                </g>
                {item.drips?.map(([dx, dy], k) => (
                  <circle key={k} className={styles.drip} cx={dx} cy={dy} r={0.9} style={{ animationDelay: `${(-0.55 * k - 0.3 * i).toFixed(2)}s`, '--cloth': item.cloth } as CSSProperties} />
                ))}
              </g>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
