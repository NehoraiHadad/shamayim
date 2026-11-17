import styles from '../marks.module.css'
import type { BuildingProps } from './buildingSpecs'
import { seeded } from './geometry'

/**
 * Date palms (reference: Jordan Valley / Beit She'an date groves, photos): a slightly bent trunk darker at its foot, a
 * knob of old frond bases under the crown, and long pinnate fronds that arch up and droop, each tapering to a point
 * and none the same length. The only crowns that lean and sway (LANDMARKS.md life rules, ILLUSTRATION.md §3 palms).
 *
 * Self-lit, sun on the left, but the crown must read by shape and value alone, since `.lit` falls back to the wall tone
 * under `.flat` skies: the drooping lower fronds form a dark underside, the fronds are thin and fanned apart so sky
 * shows between them, and their outer thirds are thinned so the tips lighten against the sky in any weather.
 */

/** [side −1 west / 1 east, length, rise of the arch, droop of the tip]; a negative droop is a rising frond. */
type Frond = [number, number, number, number]
const SPEC: Frond[] = [[-1, 5.6, 1.4, 3.2], [-1, 4.4, 2, .2], [-1, 2.8, 2.4, -2.4],
  [1, 5.2, 1.2, 3.4], [1, 4.4, 1.8, .6], [1, 2.6, 2.2, -2.2]]
const TIP = .62

/** Polygon of one frond between t0 and t1 along its arched centreline, tapering from 0.75 at the crown to a point. */
function frond([side, length, rise, droop]: Frond, t0: number, t1: number) {
  const [cx, cy, tx, ty] = [side * length * .5, -rise, side * length, droop]
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= 5; i++) {
    const t = t0 + (t1 - t0) * i / 5
    const [x, y] = [2 * (1 - t) * t * cx + t * t * tx, 2 * (1 - t) * t * cy + t * t * ty]
    const [dx, dy] = [2 * (1 - t) * cx + 2 * t * (tx - cx), 2 * (1 - t) * cy + 2 * t * (ty - cy)]
    const half = (.7 * (1 - t) + .05) / Math.hypot(dx, dy)
    left.push(`${(x - dy * half).toFixed(2)} ${(y + dx * half).toFixed(2)}`)
    right.unshift(`${(x + dy * half).toFixed(2)} ${(y - dx * half).toFixed(2)}`)
  }
  return `M${left.join('L')}L${right.join('L')}z`
}

/** A crown of uneven fronds (lengths jitter by seed), split into the paths each tone draws. */
function crown(seed: number) {
  const random = seeded(seed)
  const fronds = SPEC.map(([side, length, rise, droop]): Frond => [side, length + random() * 1.2 - .6, rise, droop])
  const join = (pick: (f: Frond) => boolean, t0: number, t1: number) =>
    fronds.filter(pick).map((f) => frond(f, t0, t1)).join('')
  const lower = (f: Frond) => f[3] > 2
  return {
    body: join(() => true, 0, TIP),
    tips: join(() => true, TIP, 1),
    underside: join(lower, 0, TIP + .1),
    sunSide: join((f) => f[0] < 0 && !lower(f), .15, TIP),
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
          <path className={styles.green} d={fronds.body} />
          <path className={styles.green} opacity={.55} d={fronds.tips} />
          <path className={styles.shade} d={fronds.underside} />
          {!night && <path className={styles.lit} opacity={.9} d={fronds.sunSide} />}
          <ellipse className={styles.shade} cx={0} cy={.5} rx={.75} ry={.9} />
        </g>
      </g>
    })}
  </>
}
