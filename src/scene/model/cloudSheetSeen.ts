import { isConvective, smoothstep } from '../../world/field/genus'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { FieldCell } from '../../world/field/types'
import { DOME_ALT, type SkyGeom } from './sky'
import { angleOf, outlineEast, outlineNorth, outlineOf, TABLE, TURN } from './cloudSheetOutline'

const DEG = 180 / Math.PI

/** The outline can itself be elongated, so include its spans in the apparent aspect. */
function outlineAspect(outline: Float32Array, east: number, north: number) {
  let near = 0, far = 0, left = 0, right = 0
  for (let i = 0; i < TABLE; i++) {
    const radius = 1 / Math.sqrt(outline[i])
    const along = (outlineEast[i] * east + outlineNorth[i] * north) * radius
    const across = (outlineEast[i] * north - outlineNorth[i] * east) * radius
    near = Math.min(near, along)
    far = Math.max(far, along)
    left = Math.min(left, across)
    right = Math.max(right, across)
  }
  return (far - near) / (right - left)
}

function prepare(cell: FieldCell, height: number, geom: SkyGeom, limit: number) {
  const { x, y, r, vKm, genus, seed } = cell
  const distance2 = x * x + y * y
  if (r <= 0 || cell.tau0 <= 0 || cell.rMinor !== undefined || distance2 >= limit ** 2) return null
  const d = Math.sqrt(distance2)
  const near = d <= r ? 90 : altitudeOf(height, d - r)
  const far = altitudeOf(height, d + r)
  if (far <= DOME_ALT) return null
  const east = d ? x / d : 0, north = d ? y / d : 1
  // The disc loses its visible sides as its footprint crosses the zenith.
  const off = smoothstep(1, 1.5, d / r)
  const entry = smoothstep(DOME_ALT, DOME_ALT + (near - far) / 2, far)
  const outline = outlineOf(seed, cell.seedBlend)
  let stretch = 1
  if (off) {
    const slant = Math.hypot(d, height)
    const width = 2 * Math.atan2(r, slant) * DEG
    // Add the projected side of the actual cloud column to the foreshortened footprint.
    const eye = (near - far) / width + vKm / (2 * r) * d / slant
    const drawn = (geom.dome(far) - geom.dome(near)) / (2 * r / d * DEG * geom.azimuthRange.period / 360)
    stretch += Math.max(0, drawn * outlineAspect(outline, east, north) / Math.min(1, eye) - 1) * off
  }
  const root = Math.sqrt(stretch)
  const radial = r / root, across = r * root
  const widest = 1 / Math.sqrt(outline.reduce((min, value) => Math.min(min, value), Infinity))
  const reach = across * widest
  const polar = off
  // The transverse Cartesian and polar terms have the same sign, bounding
  // the bearing and thus the sagitta of a partially polar footprint.
  const sagitta = polar > 0 && polar < 1
    ? (1 - polar) * (1 - Math.cos(Math.min(Math.PI, reach / (polar * d)))) : 0
  const radialReach = Math.max(r, radial * widest)
  // A reverse-triangle bound covers the nearly Cartesian cases where
  // the sagitta alone allows a full turn and gives no finite outer range.
  const cartesian = polar < 0.5 ? Math.hypot(d + radialReach, reach) / (1 - 2 * polar) : Infinity
  const cylindrical = sagitta < 1 ? (d + radialReach) / (1 - sagitta) : Infinity
  const outer = polar ? Math.min(cartesian, cylindrical) : d + reach
  if (outer >= limit) return null
  const weight = entry * smoothstep(0, Math.max(Number.EPSILON, outer - d - r), limit - outer)
  return { cell, weight, d, off: polar, east, north, sagitta, reach, bearing: Math.atan2(x, y),
    invRadial: 1 / radial, invAcross: 1 / across, invR2: 1 / (r * r),
    radialReach, support2: widest * widest, outline,
    cumulus: isConvective(genus) }
}

type Shape = NonNullable<ReturnType<typeof prepare>>
type Columns = { first: number; step: number; east: number[]; north: number[] }

function angleLimit({ cell, d, off, reach, radialReach }: Shape, range: number) {
  if (!range || !d) return Math.PI
  // Round support is a disc. For the hybrid support, the radial coordinate
  // is range - d - (1 - off) * range * (1 - cos bearing).
  const chord = (r: number) => 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0,
    (r * r - (range - d) ** 2) / (4 * range * d)))))
  const radial = off < 1 ? 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0,
    (range - d + radialReach) / (2 * range * (1 - off)))))) : Math.PI
  const shaped = off ? Math.min(radial, reach / (off * d)) : chord(reach)
  return Math.max(chord(cell.r), shaped)
}

function contribution(shape: Shape, range: number, x: number, y: number) {
  const { cell, d, off, east, north, invRadial, invAcross, invR2, support2, outline, cumulus } = shape
  const dx = x - cell.x, dy = y - cell.y
  const rr = dx * dx + dy * dy
  const along = dx * east + dy * north, aside = dx * north - dy * east
  const u = (along + off * (range - d - along)) * invRadial
  let depth = 0
  if (u * u < support2) {
    const v = (off ? aside + off * (d * angleOf(aside, d + along) - aside) : aside) * invAcross
    const radius2 = u * u + v * v
    if (radius2 < support2) {
      const at = (angleOf(u * east + v * north, u * north - v * east) / TURN + 0.5) * TABLE
      const i = Math.floor(at), a = outline[i % TABLE], b = outline[(i + 1) % TABLE]
      depth = kernel(cell.tau0, radius2 * (a + (b - a) * (at - i)), cumulus)
    }
  }
  return shape.weight * (depth - kernel(cell.tau0, rr * invR2, cumulus))
}

export function seenDepth(cells: readonly FieldCell[], height: number, geom: SkyGeom) {
  const limit = groundRangeAt(height, DOME_ALT)
  const shapes = cells.map(cell => prepare(cell, height, geom, limit)).filter(shape => shape !== null)
  if (!shapes.length) return null
  const intersects = ({ reach, d, off, radialReach, sagitta, cell }: Shape, range: number) => {
    const offset = range - d
    if (!off) return Math.abs(offset) < Math.max(cell.r, reach)
    return offset > -radialReach && offset < radialReach + range * sagitta
  }
  const at = (range: number, altitude: number) => {
    if (altitude <= DOME_ALT) return null
    const row = shapes.filter(shape => intersects(shape, range))
    if (!row.length) return null
    return (x: number, y: number) => row.reduce((sum, shape) => sum + contribution(shape, range, x, y), 0)
  }
  const row = (range: number, altitude: number, columns: Columns, out: Float64Array) => {
    out.fill(0)
    if (altitude <= DOME_ALT) return
    if (!range) {
      for (const shape of shapes) if (intersects(shape, 0)) out[0] += contribution(shape, 0, 0, 0)
      out.fill(out[0])
      return
    }
    const { east, north } = columns
    const reversed = columns.step < 0
    const step = Math.abs(columns.step)
    const first = columns.first + (reversed ? (east.length - 1) * columns.step : 0)
    const last = first + (east.length - 1) * step
    for (const shape of shapes) {
      if (!intersects(shape, range)) continue
      const half = Math.min(Math.PI, angleLimit(shape, range) + 1 / (TABLE * TABLE))
      // Use half-open bearing intervals at the antipode to count each ray once.
      for (let centre = shape.bearing + TURN * Math.ceil((first - shape.bearing - half) / TURN);
        centre - half <= last; centre += TURN) {
        const start = step ? Math.max(0, Math.ceil((centre - half - first) / step)) : 0
        const end = step ? Math.min(east.length, Math.ceil((centre + half - first) / step)) : east.length
        for (let i = start; i < end; i++) {
          const col = reversed ? east.length - 1 - i : i
          out[col] += contribution(shape, range, range * east[col], range * north[col])
        }
      }
    }
  }
  return Object.assign(at, { row })
}
