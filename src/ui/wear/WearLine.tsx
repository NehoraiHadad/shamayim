import type { CSSProperties } from 'react'
import type { WearTip } from '../../text/wear'
import { GARMENTS } from './garments'
import { GUST, blowOf, rope, smil, type Load } from './gust'
import { Peg, pegTilt } from './peg'
import styles from './WearLine.module.css'

const W = 335
const H = 86
/** The rope is tied to two small tabs just inside the page's top edge, at the gutters. */
const END_Y = 6
const SAG = 20
const STEP = 70
/** Garments are drawn ~34 px wide; on a full-width line they read best a third larger. */
const SCALE = 1.3
/** How far a garment of weight 1 drags the line down at its pegs. */
const DROP = 2.6

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Today's clothes pegged on a line strung across the card, in the order the sentence names them (RTL: first on the
 *  right). The line sags and kinks under each piece's weight, the clothes tilt with it and stand out downwind; gusts
 *  lift the line and flap the hems from the pegs, rain gear drips. Decorative; the sentence carries the words. */
export function WearLine({ garments, wind }: Pick<WearTip, 'garments' | 'wind'>) {
  const n = garments.length
  const blow = blowOf(wind.speed)
  const lean = 24 * blow * wind.drift
  const dur = `${(7 - 4.5 * blow).toFixed(1)}s`
  // Calm days still drift a little; in wind the hems flap out (in the downwind direction) and the line lifts.
  const air = { '--sway-dur': dur, '--sway-amp': `${((1.5 + 9 * blow) * (wind.drift || 1)).toFixed(1)}deg` } as CSSProperties
  const lift = 1 + 6 * blow
  const still = reducedMotion()
  const first = W / 2 + ((n - 1) * STEP) / 2
  const xOf = (i: number) => first - i * STEP
  // Every peg (or hook) is a point load; a two-peg top shares its weight between them.
  const loads: Load[] = garments.flatMap((g, i) => {
    const item = GARMENTS[g]
    const at = item.pegs.length ? item.pegs : [0]
    return at.map((px) => ({ x: xOf(i) + px * SCALE, drop: (DROP * (item.weight ?? 1)) / at.length }))
  })
  const sags = GUST.map((g) => SAG - lift * g)
  const line = rope(W, END_Y, SAG, loads)
  const ropeMotion = !still && <animate attributeName="d" {...smil(dur, sags.map((s) => rope(W, END_Y, s, loads).d))} />
  return (
    <svg className={styles.line} viewBox={`0 0 ${W} ${H}`} style={air} aria-hidden="true">
      <rect className={styles.cleat} x={-3} y={5} width={6} height={5} rx={1} />
      <rect className={styles.cleat} x={W - 3} y={5} width={6} height={5} rx={1} />
      <path className={styles.rope} d={line.d}>{ropeMotion}</path>
      {/* The twist of the cord: short pale lays along the line. */}
      <path className={styles.twist} d={line.d}>{ropeMotion}</path>
      <path className={styles.knot} d={`M-2.2 4.2l2.6 4.4M0 4l2.6 4.4M${W + 2.2} 4.2l-2.6 4.4M${W} 4l-2.6 4.4`} />
      {garments.map((g, i) => {
        const x = xOf(i)
        const shape = 4 * (x / W) * (1 - x / W) // how much of the sag this point of the line carries
        const item = GARMENTS[g]
        // The cloth hangs square to the chord between its own pegs.
        const half = Math.max(6, ...item.pegs.map(Math.abs)) * SCALE
        const tilt = (Math.atan2(line.y(x + half) - line.y(x - half), 2 * half) * 180) / Math.PI
        // Pegged cloth keeps its top on the line and its hem blows out (skew); hooked things swing (rotate).
        const blown = item.hook ? `rotate(${(-lean).toFixed(1)})` : `skewX(${lean.toFixed(1)})`
        return (
          <g key={g}>
            {!still && <animateTransform attributeName="transform" type="translate" {...smil(dur, sags.map((s) => `0 ${((s - SAG) * shape).toFixed(2)}`))} />}
            <g transform={`translate(${x.toFixed(1)} ${line.y(x).toFixed(1)}) rotate(${tilt.toFixed(1)}) scale(${SCALE})`}>
              <g transform={blown}>
                <g className={styles.item} data-hook={item.hook || undefined} style={{ animationDelay: `${(-0.22 * i).toFixed(2)}s`, '--cloth': item.cloth } as CSSProperties}>
                  {item.body}
                  {item.pegs.map((px, k) => <Peg key={px} x={px} tilt={pegTilt(i, k)} drag={item.pegs.length > 1} />)}
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
