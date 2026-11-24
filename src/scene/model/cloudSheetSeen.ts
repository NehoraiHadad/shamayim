import { smoothstep, unit } from '../../world/field/genus'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { FieldSnapshot } from '../../world/field/transmit'
import type { FieldCell } from '../../world/field/types'
import { pxPerRadAt } from './advect'
import { edgeNoise } from './cloudSheetEdges'
import { DOME_ALT } from './dome'
import type { SkyGeom } from './sky'

/*
 * The field as the eye sees it above the dome's join. The dome spreads altitude over a sky taller than it is wide, so a
 * cell drawn by its rays alone stands up as an egg. Here a whole cell keeps its place and its shape on the sky and takes
 * the eye's proportions: in the coordinates of the view (the bearing, and the logarithm of the range) a disc is an oval
 * symmetric about its widest range; it is made as much wider as it is made lower. Nothing is sheared, so an oval stays an
 * oval. Up to `DOME_ALT` the field is read exactly, as the sun and the land's light read it.
 */

/** The altitude (deg) from which a cell's shape and its outline are all the eye's: half as high again as the join. */
const SEEN_ALT = 1.5 * DOME_ALT
/** Rounding left where a cell's own depth is taken from the field's sum. */
const ROUNDING = 1e-9

interface Shape {
  cell: FieldCell
  cumulus: boolean
  /** Its range (km) and its bearing as a unit vector, east and north. */
  d: number; east: number; north: number
  /** The logarithm of its widest range; how much the oval is scaled toward it on its far and on its near side. */
  mid: number; far: number; near: number
  /** Half its height in log range; how much wider it is drawn, and the cosine of its half width so drawn. */
  high: number; wide: number; cos: number
  /** The ranges (km) it reaches over. */
  from: number; to: number
}

function shapeOf(cell: FieldCell, heightKm: number, geom: SkyGeom, perRad: number): Shape | null {
  const d = Math.hypot(cell.x, cell.y), q = cell.r / d
  // Overhead there is no oval: its rim runs round the whole sky.
  if (!(q < 1)) return null
  const farAlt = altitudeOf(heightKm, d + cell.r)
  const whole = smoothstep(DOME_ALT, SEEN_ALT, farAlt)
  const nearAlt = altitudeOf(heightKm, d - cell.r), cos = Math.cos(altitudeOf(heightKm, d) * Math.PI / 180)
  const half = Math.asin(q), high = Math.atanh(q)
  // The eye's height over width: the disc's, and over it the side of a cell as thick as it is. No cell of a sheet is taller
  // than wide (its towers are sprites).
  const disc = (nearAlt - farAlt) * Math.PI / 180 / (2 * half), side = cell.vKm / (2 * cell.r) * cos
  const drawn = (geom.dome(farAlt) - geom.dome(nearAlt)) / (2 * half * perRad)
  const stretch = drawn / Math.min(1, disc + side)
  if (stretch <= 1) return null
  // A cell nearer than its own diameter passes overhead with its foot still in view: it goes back to its own rays by then.
  const wide = 1 + (Math.min(Math.sqrt(stretch), Math.PI / 2 / half) - 1) * whole * unit(2 * (1 - q))
  // The far rim is the underside's, the rest of the height the side's and the crown's: a flatter foot under a domed top.
  const foot = 1 + (disc / (disc + side) - 1) * unit(wide * wide - 1)
  const mid = Math.log(d) + Math.log1p(-q * q) / 2, far = wide / foot, near = wide / (2 - foot)
  return {
    cell, cumulus: cell.genus === 'cu' || cell.genus === 'cg' || cell.genus === 'cb',
    d, east: cell.x / d, north: cell.y / d, mid, far, near, high, wide, cos: Math.cos(half * wide),
    from: Math.min(d - cell.r, Math.exp(mid - high / near)), to: d + cell.r,
  }
}

/** The cell's drawn depth less the one its rays alone would show, at a place at `range` km and its logarithm. */
function change(s: Shape, x: number, y: number, range: number, log: number): number {
  const { cell, d } = s
  // Off to its side: it is only ever drawn wider.
  const along = x * s.east + y * s.north
  if (along <= range * s.cos) return 0
  const inverse = 1 / (cell.r * cell.r), dx = x - cell.x, dy = y - cell.y
  const native = kernel(cell.tau0, (dx * dx + dy * dy) * inverse, s.cumulus)
  const up = log - s.mid, scaled = up * (up > 0 ? s.far : s.near)
  if (scaled >= s.high || scaled <= -s.high) return -native
  const at = Math.exp(s.mid + scaled)
  const angle = Math.atan2(x * s.north - y * s.east, along) / s.wide
  return kernel(cell.tau0, (at * at + d * d - 2 * at * d * Math.cos(angle)) * inverse, s.cumulus) - native
}

export type DepthAt = (x: number, y: number) => number

/** The layer's depth at a place (km) as a row of the sheet at that range and altitude shows it. */
export function seenDepth(placeId: string, minute: number, snapshot: FieldSnapshot[number], geom: SkyGeom, depthAt: DepthAt) {
  const { layer, cells, heightKm } = snapshot
  if (!layer || (layer.lattice !== 'low' && layer.lattice !== 'mid')) return () => depthAt
  const noise = edgeNoise(placeId, layer, minute)
  const perRad = Math.abs(pxPerRadAt(geom.azimuthAt, geom.width / 2))
  const edge = groundRangeAt(heightKm, DOME_ALT)
  const shapes = cells.filter(({ x, y, r }) => r < edge && x * x + y * y < (edge - r) ** 2)
    .map((cell) => shapeOf(cell, heightKm, geom, perRad)).filter((shape) => shape !== null)
  return (range: number, altitude: number): DepthAt => {
    const weight = smoothstep(DOME_ALT, SEEN_ALT, altitude)
    if (!weight) return depthAt
    const reach = weight * noise.reach
    const here = shapes.filter(({ from, to }) => range + reach > from && range - reach < to)
    return (east, north) => {
      // Along the ray: the projection draws its levels straight. Overhead, where every ray meets, it dies away.
      const from = Math.sqrt(east * east + north * north)
      const scale = 1 + weight * noise.at(east, north) / Math.max(from, noise.radius)
      const x = east * scale, y = north * scale
      const depth = depthAt(x, y)
      if (!here.length) return depth
      const at = from * scale, log = Math.log(at)
      let moved = 0
      for (const shape of here) if (at > shape.from && at < shape.to) moved += change(shape, x, y, at, log)
      const seen = depth + moved
      return seen < layer.floorTau + ROUNDING ? layer.floorTau : seen
    }
  }
}
