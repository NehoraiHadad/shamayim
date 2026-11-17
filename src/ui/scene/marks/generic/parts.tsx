import styles from '../marks.module.css'
import { roof, seeded } from './geometry'

/** Small shared glyph pieces: night window grids and the tile house. */

interface WindowsProps {
  /** Left edge of the first column. */
  x: number
  top: number
  bottom: number
  cols: number
  seed?: number
  share?: number
  stepX?: number
  stepY?: number
  max?: number
}

/** 1.5 px warm windows in a column grid, each lit with probability `share` (ILLUSTRATION.md §3 highrise / block). */
export function Windows({ x, top, bottom, cols, seed = 1, share = 1, stepX = 2.5, stepY = 2.5, max = 8 }: WindowsProps) {
  const random = seeded(seed)
  const cells: [number, number][] = []
  for (let y = top; y + 1.5 <= bottom; y += stepY) {
    for (let col = 0; col < cols; col++) if (random() < .55 * share + .1) cells.push([x + col * stepX, y])
  }
  return <>{cells.slice(0, max).map(([cx, cy]) => (
    <rect key={`${cx}-${cy}`} className={styles.win} x={cx} y={cy} width={1.5} height={1.5} />
  ))}</>
}

/** A small tile-roofed house standing on y 0 (house-tile in §3), for skirts and curated villages. */
export function TileHouse({ x, w = 7, h = 6, night = false, lit = false }:
  { x: number; w?: number; h?: number; night?: boolean; lit?: boolean }) {
  const wallH = h / 2
  return <>
    <rect className={styles.wall} x={x - w / 2 + .5} y={-wallH} width={w - 1} height={wallH} />
    <path className={styles.roof} d={roof(x, -wallH, w, h - wallH, 2)} />
    {night && lit && <rect className={styles.win} x={x - .75} y={-wallH + .6} width={1.5} height={1.5} />}
  </>
}
