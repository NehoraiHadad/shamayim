import { smoothstep, unit } from '../../world/field/genus'
import { LOBED_ALT } from '../../world/field/edges'
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

/** Look. The altitude of a cell's middle from which it takes the eye's proportions, as far under the join as its lobes are
 *  all there over it (`LOBED_ALT`, by when they are all its own): it crosses the join as one. */
export const SHAPED_ALT = DOME_ALT / 1.5
/**
 * Look. How much wider than its crown's an open cell's foot is stretched: half as wide again keeps an oval's sides within a
 * quarter of its widest down to .85 of the way to the far rim (an oval alone is half as wide there), and rounds the rest
 * off: a foot, not a box's two corners.
 */
const FLAT = 0.5

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
  /** How much of the air's displacement its outline takes, as it is made lower, and how still its foot is. */
  give: number; firm: number
  /** The cosine of its half width as drawn, at most. */
  cos: number
  /** The ranges (km) it is drawn over. */
  from: number; to: number
  /** 1 / r² and d², and the series (`seriesOf`) of its width as far as its widest range. */
  inverse: number; dd: number; series: Series
}

/** Cells by the strips of the ground they reach into, each strip's in the cells' own order: those that can hide a place. */
export function byStrip(cells: readonly FieldCell[]): (x: number) => readonly FieldCell[] {
  const width = cells.reduce((most, { r }) => Math.max(most, r), 0), strips = new Map<number, FieldCell[]>()
  for (const cell of cells) {
    for (let strip = Math.floor((cell.x - cell.r) / width); strip <= Math.floor((cell.x + cell.r) / width); strip++) {
      const here = strips.get(strip)
      if (here) here.push(cell)
      else strips.set(strip, [cell])
    }
  }
  return (x) => strips.get(Math.floor(x / width)) ?? []
}

/** How open the sky is before a cell's far rim (0 covered … 1 open): no foot shows where another cell still hides it, as it
 *  does up to some .8 of its radius (a third of its depth is left there) and no more at its rim, and no more of it than the
 *  other's share of its area. */
export function openness(cell: FieldCell, cellsAt: (x: number) => readonly FieldCell[]): number {
  const d = Math.hypot(cell.x, cell.y), far = 1 + cell.r / d
  const x = cell.x * far, y = cell.y * far
  let open = 1
  for (const other of cellsAt(x)) {
    if (other === cell || !open) continue
    const dx = x - other.x, dy = y - other.y, r = other.r
    if (dx * dx + dy * dy < r * r) open *= 1 - Math.min(1, r * r / (cell.r * cell.r)) * smoothstep(1, 0.7, Math.sqrt(dx * dx + dy * dy) / r)
  }
  return open
}

export function shapeOf(cell: FieldCell, heightKm: number, geom: SkyGeom, perRad: number, openAt: () => number): Shape | null {
  const d = Math.hypot(cell.x, cell.y), r = cell.r, q = r / d
  // Overhead there is no oval: its rim runs round the whole sky.
  if (!(q < 1)) return null
  const altitude = altitudeOf(heightKm, d)
  // A cell nearer than its own diameter passes overhead with its foot still in view: it goes back to its own rays by the
  // time it is over the eye, its foot the last, as that is the part still seen from its side.
  const lifted = smoothstep(SHAPED_ALT, LOBED_ALT, altitude), weight = lifted * unit(2 * (1 - q))
  if (!weight) return null
  const firm = lifted * unit(4 * (1 - q)) * openAt()
  const farAlt = altitudeOf(heightKm, d + r), nearAlt = altitudeOf(heightKm, d - r), cos = Math.cos(altitude * Math.PI / 180)
  const half = Math.asin(q), most = Math.PI / 2 / half
  // The eye's height over width: the disc's, and over it the side of a cell as thick as it is. No cell of a sheet is taller
  // than wide (its towers are sprites).
  const disc = (nearAlt - farAlt) * Math.PI / 180 / (2 * half), side = cell.vKm / (2 * r) * cos
  const drawn = (geom.dome(farAlt) - geom.dome(nearAlt)) / (2 * half * perRad)
  const stretch = drawn / Math.min(1, disc + side)
  const wide = 1 + (Math.min(Math.sqrt(Math.max(1, stretch)), most) - 1) * weight
  const foot = Math.min(FLAT * firm, most / wide - 1)
  const far = 2 * r * (d + r) / (wide * (1 + foot / 3)), near = 2 * r * (d - r) / wide
  return {
    cell, cumulus: cell.genus === 'cu' || cell.genus === 'cg' || cell.genus === 'cb',
    d, east: cell.x / d, north: cell.y / d, mid: d * d - r * r,
    wide, bend: foot * wide / (3 * far * far), far, near, give: 1 / wide, firm, cos: Math.max(0, Math.cos(half * wide * (1 + foot))),
    from: d - r, to: d + r,
    inverse: 1 / (r * r), dd: d * d, series: seriesOf(wide),
  }
}

type Series = number[]

/** The factors of `narrowed`'s terms. */
function seriesOf(wide: number, out: Series = []): Series {
  const n = 1 / (wide * wide)
  out[0] = 2 * n
  out[1] = (1 - n) / 3
  out[2] = (4 - n) / 7.5
  out[3] = (9 - n) / 14
  out[4] = (16 - n) / 22.5
  out[5] = (25 - n) / 33
  return out
}
/** The bent side's, one place at a time. */
const bent: Series = []

/**
 * The cosine of an angle `wide` times narrower, from sin² of the angle's half: the Chebyshev function T(1/wide) as
 * 2F1(-n, n; 1/2; s). Up to a right angle, the widest half of a cell, seven terms are within 1e-3.
 */
function narrowed(s: number, series: Series): number {
  return 1 - series[0] * s * (1 + series[1] * s * (1 + series[2] * s * (1 + series[3] * s
    * (1 + series[4] * s * (1 + series[5] * s)))))
}

/** The cell's drawn depth less the one its rays alone would show, at a place `range` km away whose outlines the air moves
 *  to `scale` times as far. */
export function change(shape: Shape, east: number, north: number, range: number, scale: number): number {
  const { cell, d, inverse } = shape
  // Off to its side: it is only ever drawn wider.
  const along = east * shape.east + north * shape.north
  if (along <= range * shape.cos) return 0
  const dx = east * scale - cell.x, dy = north * scale - cell.y
  const native = kernel(cell.tau0, (dx * dx + dy * dy) * inverse, shape.cumulus)
  // Its lobes are as much lower as it is, and stand on its sides and crown: its base is the level air condenses at.
  const still = shape.firm * unit(2 * (range * range - shape.mid) / shape.far)
  const at = range * (1 + (scale - 1) * shape.give * (1 - still)), up = at * at - shape.mid
  if (up >= shape.far || up <= -shape.near) return -native
  const bend = up > 0 ? shape.bend * up * up : 0, square = shape.mid + up * (shape.wide + bend)
  const cos = narrowed((1 - along / range) / 2, bend ? seriesOf(shape.wide + 3 * bend, bent) : shape.series)
  return kernel(cell.tau0, (square + shape.dd - 2 * Math.sqrt(square) * d * cos) * inverse, shape.cumulus) - native
}
