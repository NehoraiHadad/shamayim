import styles from '../marks.module.css'
import type { BuildingProps } from './buildingSpecs'
import { seeded } from './geometry'

/**
 * Date palms (reference: Jordan Valley / Beit She'an date groves, photos): a slightly bent trunk darker at its foot, a
 * knob of old frond bases under the crown, and long pinnate fronds that arch up and droop, each tapering to a point
 * and none the same length. Self-lit, sun on the left: west fronds take a lit tint, east fronds stay in shade.
 * The only crowns that lean and sway (LANDMARKS.md life rules, ILLUSTRATION.md §3 palms).
 */

/** One tapered frond from the crown point: `side` −1 west / 1 east, `length` out, arching `rise` up, tip at `droop`. */
function frond(side: number, length: number, rise: number, droop: number) {
  const [mid, tip] = [side * length * .5, side * length]
  return `M0 -.4Q${mid} ${-rise - .5} ${tip} ${droop}Q${mid} ${-rise + .6} 0 .4z`
}

/** Crown of uneven fronds: [side, length, rise, droop]; lengths jitter by seed so no two crowns match. */
function crown(seed: number) {
  const random = seeded(seed)
  const spec: [number, number, number, number][] = [[-1, 5.6, 1.2, 3], [-1, 4.2, 2, .4], [-1, 2.4, 2.6, -2.2],
    [1, 5.2, 1, 3.2], [1, 4.2, 1.8, .8], [1, 2.2, 2.4, -2]]
  const fronds = spec.map(([side, length, rise, droop]) => ({ side, d: frond(side, length + random() * 1.2 - .6, rise, droop) }))
  return {
    lit: fronds.filter((f) => f.side < 0).map((f) => f.d).join(''),
    all: fronds.map((f) => f.d).join(''),
    shade: fronds.filter((f) => f.side > 0).map((f) => f.d).join(''),
  }
}

/** Slightly bent trunk 1.4 → 1 wide, from (x, 0) to (x + bend, −height). */
function trunk(x: number, height: number, bend: number) {
  return `M${x - .7} 0Q${x + bend * .3 - .55} ${-height * .5} ${x + bend - .5} ${-height}h1`
    + `Q${x + bend * .3 + .55} ${-height * .5} ${x + .7} 0z`
}

/** Three palms of seeded heights; crowns are separate elements so `.crown` can lean them about the trunk top. */
export function Palms({ h, night, sway = false, seed = 1 }: BuildingProps) {
  const trees: [number, number, number][] = [[-4, h - 1 - seed % 2, -.8], [0, h - 3.5, .4], [4, h - 2 + (seed >> 1) % 2, 1]]
  return <>
    {trees.map(([x, height, bend]) => <g key={x}>
      <path className={styles.solid} d={trunk(x, height, bend)} />
      <rect className={styles.shade} x={x - .8} y={-1.6} width={1.6} height={1.6} />
    </g>)}
    {trees.map(([x, height, bend], i) => {
      const fronds = crown(seed * 3 + i)
      return <g key={x} transform={`translate(${x + bend} ${-height})`}>
        <g className={`${styles.crown} ${sway ? styles.sway : ''}`}>
          <path className={styles.green} d={fronds.all} />
          {!night && <path className={styles.lit} opacity={.5} d={fronds.lit} />}
          <path className={styles.shade} opacity={.3} d={fronds.shade} />
          <ellipse className={styles.shade} cx={0} cy={.6} rx={.6} ry={.8} />
        </g>
      </g>
    })}
  </>
}
