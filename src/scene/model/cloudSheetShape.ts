import { smoothstep, unit } from '../../world/field/genus'
import { altitudeOf } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { FieldCell } from '../../world/field/types'
import { DOME_ALT } from './dome'
import type { SkyGeom } from './sky'

/*
 * One cell of a sheet as the eye sees it. The dome spreads altitude over a sky taller than it is wide, so a cell drawn by
 * its rays alone stands up as an egg, and the far rim of its base narrows to a point. Here it is made as much wider as it is
 * made lower about the range it is widest at, which stays where it truly is, as a tower's sides do; an open one's foot is
 * its base's broad underside.
 *
 * The ground it covers and the depth it holds are kept exactly, whatever the shape. In the bearing φ and the square of the
 * range q the ground's area is ½ dφ dq, so a drawn place (φ, q) that shows the cell's own place (φ / W(q), F(q)) has the
 * Jacobian F'(q) / W(q): one, where the width W is F'. F is a line on the near side of the cell's widest range (its crown,
 * the same oval, wider and lower) and bends on the far side, so that W grows to the foot.
 */

/** Look. The altitude (deg) from which a cell's outline is all the eye's: half as high again as the join. */
export const SEEN_ALT = 1.5 * DOME_ALT
/** Look. The altitude of a cell's middle from which it takes the eye's proportions, all by the join: it crosses that whole. */
const SHAPED_ALT = DOME_ALT / 1.5
/**
 * Look. How much wider than its crown's an open cell's foot is stretched: .8 keeps an oval's sides within a tenth of its
 * widest down to .85 of the way to the far rim (an oval alone is half as wide there), and rounds the rest off.
 */
const FLAT = 0.8

export interface Shape {
  cell: FieldCell
  cumulus: boolean
  /** Its range (km) and its bearing as a unit vector, east and north. */
  d: number; east: number; north: number
  /** The square of its widest range (km²), where it is seated. */
  mid: number
  /** The bearing's scale there, and how it bends towards the foot. */
  wide: number; bend: number
  /** How far its foot and its crown are drawn from its seat, in the square of the range. */
  far: number; near: number
  /** The cosine of its half width as drawn, at most. */
  cos: number
  /** The ranges (km) it is drawn over. */
  from: number; to: number
}

/** How open the sky is before a cell's far rim (0 covered … 1 open): no foot shows under another cell. */
export function openness(cell: FieldCell, cells: readonly FieldCell[]): number {
  const d = Math.hypot(cell.x, cell.y), far = 1 + cell.r / d
  const x = cell.x * far, y = cell.y * far
  let open = 1
  for (const other of cells) {
    if (other === cell || !open) continue
    const dx = x - other.x, dy = y - other.y, r = 1.2 * other.r
    if (dx * dx + dy * dy < r * r) open *= smoothstep(0.8, 1.2, Math.sqrt(dx * dx + dy * dy) / other.r)
  }
  return open
}

export function shapeOf(cell: FieldCell, heightKm: number, geom: SkyGeom, perRad: number, openAt: () => number): Shape | null {
  const d = Math.hypot(cell.x, cell.y), r = cell.r, q = r / d
  // Overhead there is no oval: its rim runs round the whole sky.
  if (!(q < 1)) return null
  const altitude = altitudeOf(heightKm, d)
  // A cell nearer than its own diameter passes overhead with its foot still in view: it goes back to its own rays by then.
  const weight = smoothstep(SHAPED_ALT, DOME_ALT, altitude) * unit(2 * (1 - q))
  if (!weight) return null
  const open = openAt()
  const farAlt = altitudeOf(heightKm, d + r), nearAlt = altitudeOf(heightKm, d - r), cos = Math.cos(altitude * Math.PI / 180)
  const half = Math.asin(q), most = Math.PI / 2 / half
  // The eye's height over width: the disc's, and over it the side of a cell as thick as it is. No cell of a sheet is taller
  // than wide (its towers are sprites).
  const disc = (nearAlt - farAlt) * Math.PI / 180 / (2 * half), side = cell.vKm / (2 * r) * cos
  const drawn = (geom.dome(farAlt) - geom.dome(nearAlt)) / (2 * half * perRad)
  const stretch = drawn / Math.min(1, disc + side)
  const wide = 1 + (Math.min(Math.sqrt(Math.max(1, stretch)), most) - 1) * weight
  // A foot shows as the cell is seen from its side; from right under it there is none.
  const foot = Math.min(FLAT * open * cos * weight, most / wide - 1)
  const far = 2 * r * (d + r) / (wide * (1 + foot / 3)), near = 2 * r * (d - r) / wide
  return {
    cell, cumulus: cell.genus === 'cu' || cell.genus === 'cg' || cell.genus === 'cb',
    d, east: cell.x / d, north: cell.y / d, mid: d * d - r * r,
    wide, bend: foot * wide / (3 * far * far), far, near, cos: Math.max(0, Math.cos(half * wide * (1 + foot))),
    from: d - r, to: d + r,
  }
}

/**
 * The cosine of an angle `wide` times narrower, from sin² of the angle's half: the Chebyshev function T(1/wide) as
 * 2F1(-n, n; 1/2; s). Up to a right angle, the widest half of a cell, seven terms are within 1e-3.
 */
function narrowed(s: number, wide: number): number {
  const n = 1 / (wide * wide)
  return 1 - 2 * n * s * (1 + (1 - n) / 3 * s * (1 + (4 - n) / 7.5 * s * (1 + (9 - n) / 14 * s
    * (1 + (16 - n) / 22.5 * s * (1 + (25 - n) / 33 * s)))))
}

/** The cell's drawn depth less the one its rays alone would show, at a place at `range` km. */
export function change(shape: Shape, x: number, y: number, range: number): number {
  const { cell, d } = shape
  // Off to its side: it is only ever drawn wider.
  const along = x * shape.east + y * shape.north
  if (along <= range * shape.cos) return 0
  const inverse = 1 / (cell.r * cell.r), dx = x - cell.x, dy = y - cell.y
  const native = kernel(cell.tau0, (dx * dx + dy * dy) * inverse, shape.cumulus)
  const up = range * range - shape.mid
  if (up >= shape.far || up <= -shape.near) return -native
  const bend = up > 0 ? shape.bend * up * up : 0, square = shape.mid + up * (shape.wide + bend)
  const cos = narrowed((1 - along / range) / 2, shape.wide + 3 * bend)
  return kernel(cell.tau0, (square + d * d - 2 * Math.sqrt(square) * d * cos) * inverse, shape.cumulus) - native
}
