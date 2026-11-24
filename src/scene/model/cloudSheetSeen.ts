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
/** Sectors of the compass the shapes are kept by, for speed alone: a power of two, a third of a mean cell at the join. */
const SECTORS = 64
/** Rounding left where a cell's own depth is taken from the field's sum. */
const ROUNDING = 1e-9

interface Shape {
  cell: FieldCell
  cumulus: boolean
  /** Its range (km) and its bearing as a unit vector, east and north. */
  d: number; east: number; north: number
  /** The logarithm of its widest range, and of the one it is drawn at; the oval's scales on its far and its near side. */
  mid: number; seat: number; far: number; near: number
  /** Half its height in log range; the cosine of its half width as drawn, and the bearing's scale (`narrowed`). */
  high: number; cos: number; narrow: number[]
  /** The ranges (km) it reaches over. */
  from: number; to: number
}

/**
 * The cosine of an angle `wide` times narrower, by the powers of sin² of the angle's half: the Chebyshev function
 * T(1/wide), 2F1(-n, n; 1/2; s). Up to a right angle, the widest half of a cell, seven terms are within 1e-3.
 */
function narrowed(wide: number): number[] {
  const terms = [1], n = 1 / wide
  for (let k = 0; k < 6; k++) terms.push(terms[k] * (k * k - n * n) / ((k + 0.5) * (k + 1)))
  return terms
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
  // Nothing to show: its sides move by less than half a pixel.
  if ((wide - 1) * half * perRad < 0.5) return null
  // The far rim is the underside's, the rest of the height the side's and the crown's: a flatter foot under a domed top.
  const foot = 1 + (disc / (disc + side) - 1) * unit(wide * wide - 1)
  const mid = Math.log(d) + Math.log1p(-q * q) / 2, far = wide / foot, near = wide / (2 - foot)
  // It keeps its centre, and so the ground it covers: a half oval's is 4/3π of its height from its widest.
  const seat = mid + 4 / (3 * Math.PI) * (high / near - high / far)
  return {
    cell, cumulus: cell.genus === 'cu' || cell.genus === 'cg' || cell.genus === 'cb',
    d, east: cell.x / d, north: cell.y / d, mid, seat, far, near, high, cos: Math.cos(half * wide), narrow: narrowed(wide),
    from: Math.min(d - cell.r, Math.exp(seat - high / near)), to: d + cell.r,
  }
}

/** The cell's drawn depth less the one its rays alone would show, at a place at `range` km. */
function change(s: Shape, x: number, y: number, range: number): number {
  const { cell, d } = s
  // Off to its side: it is only ever drawn wider.
  const along = x * s.east + y * s.north
  if (along <= range * s.cos) return 0
  const inverse = 1 / (cell.r * cell.r), dx = x - cell.x, dy = y - cell.y
  const native = kernel(cell.tau0, (dx * dx + dy * dy) * inverse, s.cumulus)
  const up = Math.log(range) - s.seat, scaled = up * (up > 0 ? s.far : s.near)
  if (scaled >= s.high || scaled <= -s.high) return -native
  const at = Math.exp(s.mid + scaled)
  const half = (1 - along / range) / 2, n = s.narrow
  const cos = n[0] + half * (n[1] + half * (n[2] + half * (n[3] + half * (n[4] + half * (n[5] + half * n[6])))))
  return kernel(cell.tau0, (at * at + d * d - 2 * at * d * cos) * inverse, s.cumulus) - native
}

/** The sector of a bearing given by a vector of any length: a measure that grows with it, with no trigonometry. */
function sectorOf(east: number, north: number): number {
  const turn = north / (Math.abs(east) + Math.abs(north) || 1)
  return (east >= 0 ? 1 - turn : 3 + turn) * SECTORS / 4 & SECTORS - 1
}

/** The shapes by the sectors they are drawn in (a half turn each at most). */
function bySector(shapes: Shape[]): Shape[][] {
  const sectors: Shape[][] = Array.from({ length: SECTORS }, () => [])
  for (const shape of shapes) {
    const { east, north, cos } = shape, sin = Math.sqrt(1 - cos * cos)
    const last = sectorOf(east * cos + north * sin, north * cos - east * sin)
    let sector = sectorOf(east * cos - north * sin, north * cos + east * sin)
    for (; sector !== last; sector = sector + 1 & SECTORS - 1) sectors[sector].push(shape)
    sectors[last].push(shape)
  }
  return sectors
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
  const sectors = bySector(shapes)
  return (range: number, altitude: number): DepthAt => {
    const weight = smoothstep(DOME_ALT, SEEN_ALT, altitude)
    if (!weight) return depthAt
    // Along the ray: the projection draws its levels straight. Overhead, where every ray meets, it dies away.
    const along = weight / Math.max(range, noise.radius)
    return (east, north) => {
      const scale = 1 + along * noise.at(east, north)
      const x = east * scale, y = north * scale
      const depth = depthAt(x, y)
      const here = sectors[sectorOf(east, north)], at = range * scale
      if (!here.length) return depth
      let moved = 0
      for (let i = 0; i < here.length; i++) if (at > here[i].from && at < here[i].to) moved += change(here[i], x, y, at)
      const seen = depth + moved
      return seen < layer.floorTau + ROUNDING ? layer.floorTau : seen
    }
  }
}
