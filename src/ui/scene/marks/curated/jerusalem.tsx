import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'
import { Dome } from '../generic/shadow'

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
 * YMCA (1933, Harmon): a low limestone hall with a domed wing and the tall square bell tower (46 m, per data). The
 * tower is straight-sided, opens near its top in tall paired arches (the belfry) and ends in a small dome with a
 * finial (photos from King David St). Self-lit: lit west faces, shade on the east.
 */
export function Ymca({ h, night }: BuildingProps) {
  const domeBase = -h + 2.6
  const belfry = domeBase + .8
  return <>
    <rect className={styles.wall} x={-7} y={-5} width={14} height={5} />
    <rect className={styles.lit} x={-7} y={-5} width={1.5} height={5} />
    <rect className={styles.shade} x={-7} y={-5} width={14} height={.5} opacity={.5} />
    <Dome cx={-4.3} y={-5} r={2.1} />
    <rect className={styles.wall} x={-2} y={belfry} width={4} height={-belfry} />
    <rect className={styles.lit} x={-2} y={belfry} width={1.4} height={-belfry} />
    <rect className={styles.shade} x={1.2} y={belfry} width={.8} height={-belfry} />
    {/* Cornice under the belfry, then the paired arched openings. */}
    <rect className={styles.shade} x={-2.3} y={belfry + 4.4} width={4.6} height={.6} />
    {[-1.35, .35].map((x) => <path key={x} className={night ? styles.win : styles.shade}
      d={`M${x} ${belfry + 3.8}v-2.4a.5 .5 0 0 1 1 0v2.4z`} />)}
    <rect className={styles.wall} x={-2.3} y={domeBase} width={4.6} height={.8} />
    <rect className={styles.lit} x={-2.3} y={domeBase} width={1.4} height={.8} />
    <Dome cx={0} y={domeBase} r={1.6} />
    <rect className={styles.solid} x={-.25} y={-h} width={.5} height={1.2} />
    {night && [-5, 3.5].map((x) => <rect key={x} className={styles.win} x={x} y={-3.2} width={1.5} height={1.5} />)}
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

/** Ashlar joints per course (x, top y): irregular, so the wall reads as laid stone, not a ruled grid. */
const JOINTS: [number, number][] = [[-7, -1.5], [-3.6, -1.5], [.5, -1.5], [5.2, -1.5], [-5.4, -3], [-1.2, -3],
  [2.9, -3], [7.1, -3], [-6.8, -5], [-2.9, -5], [1.6, -5], [4.4, -5]]

/**
 * Western Wall / Temple Mount retaining wall with the Dome of the Rock above: blue-tiled octagon, drum, gilded dome
 * (slightly pointed) and finial. The wall shows its huge Herodian courses (photos from the plaza). Wall and dome are
 * floodlit at night, so the gold and the wall stay bright.
 */
export function WallAndDome({ h, night }: BuildingProps) {
  const dome = -h + 1.6
  return <>
    <rect className={night ? styles.lit : styles.wall} x={-9} y={-5} width={18} height={5} />
    {[-1.5, -3].map((y) => <rect key={y} className={styles.shade} x={-9} y={y - .25} width={18} height={.5}
      opacity={.6} />)}
    {JOINTS.map(([x, y]) => <rect key={`${x}${y}`} className={styles.shade} x={x} y={y} width={.4}
      height={y === -5 ? 1.75 : 1.25} opacity={.45} />)}
    <rect className={styles.green} x={-6} y={-4.6} width={1.2} height={.6} />
    <rect className={styles.panel} x={-4.5} y={-9} width={9} height={4} />
    <rect className={styles.wall} x={-4.5} y={-9.6} width={9} height={.8} />
    <rect className={styles.panel} x={-2.9} y={-11} width={5.8} height={1.6} />
    <path className={styles.gold} d={`M-3.1 -11Q-3.3 ${dome + 1.2} 0 ${dome}Q3.3 ${dome + 1.2} 3.1 -11z`} />
    <rect className={styles.gold} x={-.35} y={-h} width={.7} height={1.8} />
    {night && [-3.2, -.75, 1.7].map((x) => <rect key={x} className={styles.win} x={x} y={-8} width={1.5} height={2} rx={.6} />)}
  </>
}
