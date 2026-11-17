import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'

/**
 * Jerusalem's curated skyline in px (x 0 centre, y 0 ground). Reference notes per glyph; proportions are read from
 * photos and simplified to a 1.5 px minimum feature, not surveyed.
 */

/** Crenellated top edge from x0 to x1 at y, merlons 1.5 wide every 3 px. */
function merlons(x0: number, x1: number, y: number) {
  let d = ''
  for (let x = x0; x + 1.5 <= x1; x += 3) d += `M${x} ${y}h1.5v-1.5h-1.5z`
  return d
}

/**
 * Chords Bridge (Calatrava, 2008): one white inclined pylon, a harp of stays fanning down to the curved deck on one
 * side and back-stays to the ground on the other. Mast 118 m (data). Lean direction relative to our south view and
 * the ~25 % lean are unverified, drawn from photos.
 */
export function ChordsBridge({ h }: BuildingProps) {
  const deck = -2.5
  const foot = -6
  const top: [number, number] = [foot - .2 * h, -h]
  const along = (t: number): [number, number] => [foot + (top[0] - foot) * t, deck + (top[1] - deck) * t]
  return <>
    <rect className={styles.wall} x={-8} y={deck} width={21} height={1.5} />
    <rect className={styles.shade} x={-8} y={deck + 1} width={21} height={.5} />
    <path className={styles.wall} d={`M${foot - 1.1} ${deck}h2.2L${top[0] + .6} ${top[1]}h-1.2z`} />
    <g className={styles.cable}>
      {[.42, .5, .58, .66, .74, .82, .9].map((t, i) => {
        const [x, y] = along(t)
        return <line key={t} x1={x + .4} y1={y} x2={-2 + i * 2.1} y2={deck} />
      })}
      {[.86].map((t) => { const [x, y] = along(t); return <line key={t} x1={x - .4} y1={y} x2={-8} y2={deck} /> })}
    </g>
  </>
}

/**
 * Tower of David citadel: crenellated walls, the square Phasael tower, and the Ottoman minaret (1655) that gives the
 * citadel its silhouette: a slim shaft, a round corbelled gallery, a narrower stepped upper stage and a small domed
 * cap with a finial (photos from Jaffa Gate). Self-lit with the sun on the left.
 */
export function TowerOfDavid({ h, night }: BuildingProps) {
  const gallery = -h + 6.5
  return <>
    <path className={styles.wall} d={`M-8 0V-6H8V0z${merlons(-8, 8, -6)}`} />
    <rect className={styles.lit} x={-8} y={-6} width={1.5} height={6} />
    <path className={styles.wall} d={`M-7.5 0V-10H-2V0z${merlons(-7.5, -2, -10)}`} />
    <rect className={styles.lit} x={-7.5} y={-10} width={1.5} height={10} />
    <rect className={styles.shade} x={-2.8} y={-10} width={.8} height={10} />
    {/* Minaret: square footing on the wall, slim shaft up to the gallery. */}
    <rect className={styles.wall} x={2.6} y={-7.5} width={2.8} height={1.5} />
    <rect className={styles.wall} x={3} y={gallery} width={2} height={-7.5 - gallery} />
    <rect className={styles.lit} x={3} y={gallery} width={.8} height={-7.5 - gallery} />
    {/* Round gallery: a balcony drum with its corbelled underside in shade. */}
    <path className={styles.shade} d={`M2.2 ${gallery + .7}h3.6q-1.8 1.4 -3.6 0z`} />
    <rect className={styles.wall} x={2.2} y={gallery - .5} width={3.6} height={1.2} />
    <rect className={styles.lit} x={2.2} y={gallery - .5} width={1.1} height={1.2} />
    {/* Stepped top: a narrower stage, a narrower lantern, then the cap and finial. */}
    <rect className={styles.wall} x={3.2} y={gallery - 2.6} width={1.6} height={2.1} />
    <rect className={styles.lit} x={3.2} y={gallery - 2.6} width={.6} height={2.1} />
    <rect className={styles.wall} x={3.45} y={gallery - 3.8} width={1.1} height={1.2} />
    <path className={styles.lit} d={`M3.25 ${gallery - 3.8}a.75 .9 0 0 1 1.5 0z`} />
    <rect className={styles.solid} x={3.8} y={-h} width={.4} height={1.6} />
    {night && <>
      <rect className={styles.win} x={-5.5} y={-7.5} width={1.5} height={1.5} />
      <rect className={styles.win} x={3.25} y={gallery + 3} width={1.5} height={1.5} />
    </>}
  </>
}

/** Courses bottom-up (height, joint offset): big Herodian ashlars below, the smaller later courses above. */
const COURSES: [number, number][] = [[1.9, 0], [1.9, 2.1], [1.7, .9], [1.3, 2.6], [1.1, 1.4], [1.1, .3]]

/**
 * Western Wall: the Temple Mount retaining wall, huge Herodian courses at the bottom and smaller ones above, caper
 * bushes growing from the joints (photos from the plaza). Floodlit at night, so the stone stays bright.
 */
export function WesternWall({ h, night }: BuildingProps) {
  const rows = COURSES.map(([height, offset], i) => ({
    y: -COURSES.slice(0, i + 1).reduce((sum, [rise]) => sum + rise, 0), height, offset,
  })).filter((row) => row.y >= -h - .1)
  const wallTop = rows.at(-1)!.y
  return <>
    <rect className={night ? styles.lit : styles.wall} x={-9} y={wallTop} width={18} height={-wallTop} />
    <rect className={styles.lit} x={-9} y={wallTop} width={18} height={.6} />
    {rows.slice(1).map((row) => <rect key={row.y} className={styles.shade} x={-9} y={row.y + row.height - .2}
      width={18} height={.4} opacity={.55} />)}
    {rows.flatMap((row) => Array.from({ length: 5 }, (_, i) => -8.6 + row.offset + i * (3 + row.height))
      .filter((x) => x < 8.6).map((x) => <rect key={`${row.y}${x}`} className={styles.shade} x={x} y={row.y}
        width={.4} height={row.height} opacity={.4} />))}
    <rect className={styles.green} x={-6} y={-6.9} width={1.3} height={.7} />
    <rect className={styles.green} x={3.6} y={-5.2} width={1} height={.6} />
    <rect className={styles.green} x={-1.5} y={-8.3} width={.9} height={.5} />
  </>
}