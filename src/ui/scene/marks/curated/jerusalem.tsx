import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'
import { taper } from '../generic/geometry'

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

/** YMCA (1933): low limestone hall with a domed wing, central bell tower (46 m, per data) with arched belfry and dome. */
export function Ymca({ h, night }: BuildingProps) {
  const shaft = h - 4.5
  return <>
    <rect className={styles.wall} x={-7} y={-5} width={14} height={5} />
    <path className={styles.wall} d="M-6.5 -5a2.2 2.2 0 0 1 4.4 0z" />
    <path className={styles.wall} d={taper(0, 3.4, 3, shaft)} />
    <rect className={styles.wall} x={-1.9} y={-shaft - .5} width={3.8} height={.8} />
    {[-1.2, .2].map((x) => <rect key={x} className={night ? styles.win : styles.shade} x={x} y={-shaft + 1}
      width={1} height={2.5} rx={.5} />)}
    <path className={styles.wall} d={`M-1.4 ${-shaft - .5}a1.4 1.9 0 0 1 2.8 0z`} />
    <rect className={styles.solid} x={-.35} y={-h} width={.7} height={2.2} />
    {night && [-5, 3.5].map((x) => <rect key={x} className={styles.win} x={x} y={-3.2} width={1.5} height={1.5} />)}
  </>
}

/** Tower of David citadel: crenellated walls, the square Phasael tower, the slim Ottoman minaret with balcony and cap. */
export function TowerOfDavid({ h, night }: BuildingProps) {
  const shaft = h - 4
  return <>
    <path className={styles.wall} d={`M-8 0V-6H8V0z${merlons(-8, 8, -6)}`} />
    <path className={styles.wall} d={`M-7.5 0V-10H-2V0z${merlons(-7.5, -2, -10)}`} />
    <path className={styles.wall} d={taper(4, 2.2, 1.8, shaft, 6)} />
    <rect className={styles.wall} x={2.4} y={-shaft + 1} width={3.2} height={1} />
    <rect className={styles.wall} x={3.2} y={-shaft - 1.5} width={1.6} height={1.6} />
    <path className={styles.wall} d={`M3 ${-shaft - 1.5}a1 1.3 0 0 1 2 0z`} />
    <rect className={styles.solid} x={3.75} y={-h} width={.5} height={1.4} />
    {night && <>
      <rect className={styles.win} x={-5.5} y={-7.5} width={1.5} height={1.5} />
      <rect className={styles.win} x={3.25} y={-shaft + 3} width={1.5} height={1.5} />
    </>}
  </>
}

/**
 * Western Wall / Temple Mount retaining wall with the Dome of the Rock above: blue-tiled octagon, drum, gilded dome
 * (slightly pointed) and finial. Wall and dome are floodlit at night, so the gold and the wall stay bright.
 */
export function WallAndDome({ h, night }: BuildingProps) {
  const dome = -h + 1.6
  return <>
    <rect className={night ? styles.lit : styles.wall} x={-9} y={-5} width={18} height={5} />
    <rect className={styles.shade} x={-9} y={-2.6} width={18} height={.5} opacity={.5} />
    <rect className={styles.panel} x={-4.5} y={-9} width={9} height={4} />
    <rect className={styles.wall} x={-4.5} y={-9.6} width={9} height={.8} />
    <rect className={styles.panel} x={-2.9} y={-11} width={5.8} height={1.6} />
    <path className={styles.gold} d={`M-3.1 -11Q-3.3 ${dome + 1.2} 0 ${dome}Q3.3 ${dome + 1.2} 3.1 -11z`} />
    <rect className={styles.gold} x={-.35} y={-h} width={.7} height={1.8} />
    {night && [-3.2, -.75, 1.7].map((x) => <rect key={x} className={styles.win} x={x} y={-8} width={1.5} height={2} rx={.6} />)}
  </>
}
