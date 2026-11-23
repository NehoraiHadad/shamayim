import { cellRim, rimRadiusSquared } from '../../world/field/cellRim'
import type { FieldCell } from '../../world/field/types'
import { crownAt, halfAt, headsOf, towerAnvil, type TowerHeadShape } from './towerHeads'

const SECTORS = 12
const RIM = Array.from({ length: SECTORS }, (_, i) => {
  const angle = 2 * Math.PI * i / SECTORS
  return [Math.cos(angle), Math.sin(angle)] as const
})
export const SOLAR_DIAMETER_RAD = 0.53 * Math.PI / 180

/** Read the drawn cell's outline in the local screen basis. */
export function shadowLobes(cell: FieldCell, bearing: number, handed: number, sunOffset: number, cot: number, slope: number,
  sprite?: TowerHeadShape) {
  if (cell.lattice === 'tower') return towerLobes(cell, sunOffset, handed, cot, slope, sprite)
  const rim = cellRim(cell)
  if (!rim) return RIM.map(() => 0)
  const sin = Math.sin(bearing), cos = Math.cos(bearing)
  return RIM.map(([x, y]) => {
    const across = handed * x, away = slope * y
    return Math.sqrt(rimRadiusSquared(rim, across * cos + away * sin, -across * sin + away * cos)) - 1
  })
}

const HEAD_SLICES = 16
// A kilometre-scale shape uses the same generator without hitting the painter's half-pixel minimum.
const SHAPE_UNITS_PER_KM = 64

function towerLobes(cell: FieldCell, sunOffset: number, handed: number, cot: number, slope: number, sprite?: TowerHeadShape) {
  const radii = new Array<number>(SECTORS).fill(0)
  const { r, vKm, seed, baseKm, genus } = cell
  const span = r + vKm * cot / 2
  const w = 2 * r * SHAPE_UNITS_PER_KM, tall = vKm * SHAPE_UNITS_PER_KM
  const shape = sprite && sprite.tall > 0 ? sprite : { seed, w, tall, anvil: towerAnvil(genus === 'cb', baseKm + vKm, w, tall) }
  const kmPerX = 2 * r / shape.w, kmPerY = vKm / shape.tall
  const sin = Math.sin(sunOffset), cos = Math.cos(sunOffset)
  // Project the union of horizontal slices of the painted heads. The sprite gives their relative outlines.
  // The cell's own base and depth place the slices in the solar projection, independently of perspective.
  for (const head of headsOf(shape)) {
    for (let row = 0; row < HEAD_SLICES; row++) {
      const y = -head.tall * row / HEAD_SLICES
      const along = (-y * kmPerY - vKm / 2) * cot
      const u = (head.x * kmPerX - sin * along) * handed / span
      const v = -slope * cos * along / span
      const radius = halfAt(head, y) * Math.sqrt(1 - crownAt(head, y) ** 2) * kmPerX / span
      const chordBase = radius * radius - u * u - v * v
      for (let i = 0; i < SECTORS; i++) {
        const dot = RIM[i][0] * u + RIM[i][1] * v
        const chord = chordBase + dot * dot
        if (chord > 0) radii[i] = Math.max(radii[i], dot + Math.sqrt(chord))
      }
    }
  }
  const mean = radii.reduce((sum, radius) => sum + radius, 0) / SECTORS
  return radii.map(radius => Math.max(-.20, Math.min(.20, radius - mean)))
}

export interface ShadowEdge {
  lobes: readonly number[]
  penumbraX: number
  penumbraY: number
  centre: number
  widthX: number
  widthY: number
}

const radialQuadrature = [[.019855, .050614], [.101667, .111191], [.237234, .156853], [.408283, .181342],
  [.591717, .181342], [.762766, .156853], [.898333, .111191], [.980145, .050614]]

/** Mean beam removal of the old τ(1−r²)² profile divided by its peak.
 * With u = 1−r² the area measure is uniform. Above τ=20 the Gaussian
 * tail beyond u=1 is negligible. */
function equivalentArea(tau: number) {
  return (tau > 20 ? 1 - Math.sqrt(Math.PI / tau) / 2
    : radialQuadrature.reduce((sum, [u, w]) => sum - w * Math.expm1(-tau * u * u), 0)) / -Math.expm1(-tau)
}

export function shadowEdge(lobes: readonly number[], tau: number, rx: number, ry: number, penumbraX: number, penumbraY: number): ShadowEdge {
  const area = equivalentArea(tau), radius = Math.sqrt(area)
  // The thin ragged cloud rim dominates the projected solar disc at 1×.
  // Give it room across a foreshortened axis, within the cell's own scale
  // so a subpixel cell cannot become an opaque multi-pixel smear.
  const width = (axis: number, disc: number) => Math.min(1.25 * radius,
    Math.hypot(.42 * radius, Math.min(.96 * radius, 6.8 / axis), disc / axis))
  const widthX = width(rx, penumbraX), widthY = width(ry, penumbraY)
  const rim = lobes.map(lobe => lobe * radius)
  const mean = rim.reduce((sum, lobe) => sum + lobe, 0) / rim.length
  let variance = 0
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i] - mean, b = rim[(i + 1) % rim.length] - mean
    variance += (a * a + a * b + b * b) / (3 * rim.length)
  }
  // The disc profile is a CDF with radial variance width²/16. Its
  // angular mean plus the squared rim radius gives the integrated area.
  const centre = Math.sqrt(area - variance - (widthX ** 2 + widthY ** 2) / 32) - mean
  return { lobes: rim, penumbraX, penumbraY, centre, widthX, widthY }
}

export const DISC_EDGE_10_90 = .68

/** Effective depth after spatially averaging the transmission through the
 * cloud edge. Blurring depth before exponentiating would bring back the rim. */
export function shadowCoverage(distance: number, radius: number, width: number) {
  const t = 2 * (radius - distance) / width
  if (t <= -1) return 0
  if (t >= 1) return 1
  return .5 + (Math.asin(t) + t * Math.sqrt(1 - t * t)) / Math.PI
}

export function edgeCoverage(edge: ShadowEdge, x: number, y: number) {
  const distance = Math.hypot(x, y)
  if (!distance) return 1
  const count = edge.lobes.length
  const sector = (Math.atan2(y, x) / (2 * Math.PI) * count + count) % count, k = Math.floor(sector)
  const a = edge.lobes[k], b = edge.lobes[(k + 1) % count]
  const width = Math.hypot(x * edge.widthX, y * edge.widthY) / distance
  return shadowCoverage(distance, edge.centre + a + (b - a) * (sector - k), width)
}
