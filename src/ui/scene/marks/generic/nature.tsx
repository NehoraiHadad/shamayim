import styles from '../marks.module.css'
import type { BuildingProps } from './buildingSpecs'

/** Date palms: the only crowns that lean and sway (LANDMARKS.md life rules, ILLUSTRATION.md §3 palms). */

/** A drooping frond from the crown point towards `side` (−1 west, 1 east), `length` px out. */
function frond(side: number, length: number, droop: number) {
  const tip = `${side * length} ${droop}`
  return `M0 0Q${side * length * .45} ${-length * .45} ${tip}Q${side * length * .5} ${-length * .12} 0 .9z`
}

const CROWN = [frond(-1, 4.6, 1.6), frond(1, 4.6, 1.6), frond(-1, 3.6, -1.2), frond(1, 3.6, -1.2),
  'M-.5 0Q-.6 -2.6 0 -3.6Q.6 -2.6 .5 0z'].join('')

/** Slightly curved trunk 1.5 → 1.1 wide, from (x, 0) to (x + bend, −height). */
function trunk(x: number, height: number, bend: number) {
  return `M${x - .75} 0Q${x + bend * .3 - .6} ${-height * .5} ${x + bend - .55} ${-height}h1.1`
    + `Q${x + bend * .3 + .6} ${-height * .5} ${x + .75} 0z`
}

/** Three palms of seeded heights; crowns are separate elements so `.crown` can lean them about the trunk top. */
export function Palms({ h, sway = false, seed = 1 }: BuildingProps) {
  const trees: [number, number, number][] = [[-4, h - 1 - seed % 2, -.6], [0, h - 3.5, .3], [4, h - 2 + (seed >> 1) % 2, .8]]
  return <>
    {trees.map(([x, height, bend]) => <path key={x} className={styles.solid} d={trunk(x, height, bend)} />)}
    {trees.map(([x, height, bend]) => (
      <g key={x} transform={`translate(${x + bend} ${-height})`}>
        <path className={`${styles.green} ${styles.crown} ${sway ? styles.sway : ''}`} d={CROWN} />
      </g>
    ))}
  </>
}
