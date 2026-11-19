import styles from '../marks.module.css'
import type { BuildingProps } from '../generic/buildingSpecs'

/**
 * Jerusalem's curated skyline in px (x 0 centre, y 0 ground). Reference notes per glyph; proportions are read from
 * photos and simplified to a 1.5 px minimum feature, not surveyed.
 */

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

/** Courses bottom-up (height, joint offset): big Herodian ashlars below, the smaller later courses above. */
/** The lower courses are Herodian ashlars with drafted margins; the ones above are later, smaller stones. */
const HERODIAN = 3
const COURSES: [number, number][] = [[1.9, 0], [1.9, 2.1], [1.7, .9], [1.3, 2.6], [1.1, 1.4], [1.1, .3]]

/**
 * Western Wall: the Temple Mount retaining wall, huge Herodian courses at the bottom and smaller ones above, caper
 * bushes growing from the joints (photos from the plaza). Floodlit at night, so the stone stays bright.
 */
export function WesternWall({ h, night }: BuildingProps) {
  const rows = COURSES.map(([height, offset], i) => ({
    y: -COURSES.slice(0, i + 1).reduce((sum, [rise]) => sum + rise, 0), height, offset, herodian: i < HERODIAN,
  })).filter((row) => row.y >= -h - .1)
  const wallTop = rows.at(-1)!.y
  /** Stones of a course as [left, right]: Herodian ashlars run long (about 2.6× their height), later ones shorter. */
  const stones = (row: (typeof rows)[number]) => {
    const step = row.height * (row.herodian ? 2.6 : 2)
    return Array.from({ length: 9 }, (_, i) => -9 - row.offset + i * step).filter((x) => x < 9 && x + step > -9)
      .map((x) => [Math.max(-9, x), Math.min(9, x + step)] as const)
  }
  return <>
    <rect className={night ? styles.lit : styles.wall} x={-9} y={wallTop} width={18} height={-wallTop} />
    <rect className={styles.lit} x={-9} y={wallTop} width={18} height={.6} />
    {rows.flatMap((row) => stones(row).map(([left, right]) => <g key={`${row.y}${left}`}>
      {/* Joint under each stone and at its far end. */}
      <rect className={styles.shade} x={left} y={row.y + row.height - .35} width={right - left} height={.35} opacity={.6} />
      <rect className={styles.shade} x={right - .35} y={row.y} width={.35} height={row.height} opacity={.5} />
      {/* Herodian drafted margins: the chiselled band round each boss catches the light on top and on the sun side. */}
      {row.herodian && !night && <>
        <rect className={styles.lit} x={left} y={row.y} width={right - left - .35} height={.35} />
        <rect className={styles.lit} x={left} y={row.y} width={.35} height={row.height - .35} />
      </>}
    </g>))}
    <rect className={styles.green} x={-6} y={-6.9} width={1.3} height={.7} />
    <rect className={styles.green} x={3.6} y={-5.2} width={1} height={.6} />
    <rect className={styles.green} x={-1.5} y={-8.3} width={.9} height={.5} />
  </>
}
