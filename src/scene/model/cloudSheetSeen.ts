import { kernel } from '../../world/field/rasterNodes'
import type { FieldCell } from '../../world/field/types'
import type { SkyGeom } from './sky'
import { angleOf, TABLE, TURN } from './cloudSheetOutline'
import { prepare, type Shape } from './cloudSheetProjection'

type Columns = { first: number; step: number; east: number[]; north: number[] }

// At full polar weight this is the equal-area radial coordinate: its
// derivative is range/d, cancelling the bearing coordinate's scale d.
const radialOffset = (range: number, d: number, off: number) =>
  range - d + (off ? off * (range - d) ** 2 / (2 * d) : 0)
const radialTerm = ({ off, d }: Shape, range: number) =>
  radialOffset(range, d, off) - (1 - off) * (range - d)

function angleLimit({ cell, d, off, reach, radialReach }: Shape, range: number) {
  if (!range || !d) return Math.PI
  // Round support is a disc. Hybrid radial support adds the remaining
  // Cartesian sagitta to the equal-area row coordinate.
  const chord = (r: number) => 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0,
    (r * r - (range - d) ** 2) / (4 * range * d)))))
  const radial = off < 1 ? 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0,
    (radialOffset(range, d, off) + radialReach) / (2 * range * (1 - off)))))) : Math.PI
  const shaped = off ? Math.min(radial, reach / (off * d)) : chord(reach)
  return Math.max(chord(cell.r), shaped)
}

function contribution(shape: Shape, radial: number, x: number, y: number, bearing?: number) {
  const { cell, d, off, east, north, invRadial, invAcross, invR2, support2, outline, cumulus } = shape
  const dx = x - cell.x, dy = y - cell.y
  const rr = dx * dx + dy * dy
  const coordinatesNeeded = off < 1 || bearing === undefined
  const aside = coordinatesNeeded ? dx * north - dy * east : 0
  const along = coordinatesNeeded ? dx * east + dy * north : 0
  const angle = off ? (bearing ?? Math.atan2(aside, d + along)) : 0
  const v = ((1 - off) * aside + off * d * angle) * invAcross
  const u = ((1 - off) * along + radial) * invRadial + shape.shear * v * v
  let depth = 0
  if (u * u < support2) {
    const radius2 = u * u + v * v
    if (radius2 < support2) {
      const at = (angleOf(u * east + v * north, u * north - v * east) / TURN + 0.5) * TABLE
      const i = Math.floor(at), a = outline[i === TABLE ? 0 : i], b = outline[i + 1 >= TABLE ? 0 : i + 1]
      depth = kernel(cell.tau0, radius2 * (a + (b - a) * (at - i)), cumulus)
    }
  }
  return depth - kernel(cell.tau0, rr * invR2, cumulus)
}

export function seenDepth(cells: readonly FieldCell[], height: number, geom: SkyGeom) {
  const shapes = cells.map(cell => prepare(cell, height, geom)).filter(shape => shape !== null)
  if (!shapes.length) return null
  const intersects = ({ reach, d, off, radialReach, sagitta, cell }: Shape, range: number) => {
    const offset = radialOffset(range, d, off)
    if (!off) return Math.abs(offset) < Math.max(cell.r, reach)
    return Math.abs(range - d) < cell.r || (offset > -radialReach && offset < radialReach + range * sagitta)
  }
  const at = (range: number, _altitude: number) => {
    const row = shapes.filter(shape => intersects(shape, range))
      .map(shape => ({ shape, radial: radialTerm(shape, range) }))
    if (!row.length) return null
    return (x: number, y: number) => row.reduce((sum, { shape, radial }) => sum + contribution(shape, radial, x, y), 0)
  }
  const row = (range: number, _altitude: number, columns: Columns, out: Float64Array) => {
    out.fill(0)
    if (!range) {
      for (const shape of shapes) if (intersects(shape, 0)) out[0] += contribution(shape, radialTerm(shape, 0), 0, 0)
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
      const radial = radialTerm(shape, range)
      const half = Math.min(Math.PI, angleLimit(shape, range) + 1 / (TABLE * TABLE))
      // Use half-open bearing intervals at the antipode to count each ray once.
      for (let centre = shape.bearing + TURN * Math.ceil((first - shape.bearing - half) / TURN);
        centre - half <= last; centre += TURN) {
        const start = step ? Math.max(0, Math.ceil((centre - half - first) / step)) : 0
        const end = step ? Math.min(east.length, Math.ceil((centre + half - first) / step)) : east.length
        const offset = first - centre
        for (let i = start; i < end; i++) {
          const col = reversed ? east.length - 1 - i : i
          out[col] += contribution(shape, radial, range * east[col], range * north[col], offset + i * step)
        }
      }
    }
  }
  return Object.assign(at, { row })
}
