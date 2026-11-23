import { seeded } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/field/genus'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { FieldCell } from '../../world/field/types'
import { DOME_ALT, type SkyGeom } from './sky'

const DEG = 180 / Math.PI
const TURN = 2 * Math.PI
// Lovejoy (1982) measured perimeter dimension 1.35, hence a radial spectrum m^-(2.5 - 1.35).
// Use modes 2–9 (mode 1 would move the centre), with at least ten samples per shortest wave.
const TABLE = 96, FALL = 1.15
// The prototype used 18% RMS radius variation and 1.07 area compensation.
// With contour-aware axes, the 120-field calibration found 1.07 added 0.0117 ground cover.
// Reduce the area correction by two points to keep the ground-cover error inside 0.01.
const SCATTER = 0.18, OVERLAP = 1.05
const modes = Array.from({ length: 8 }, (_, i) => (i + 2) ** -FALL)
const rms = Math.sqrt(modes.reduce((sum, amplitude) => sum + amplitude ** 2 / 2, 0))
const harmonics = modes.map((amplitude, i) => ({
  cosine: Float64Array.from({ length: TABLE }, (_, n) => amplitude * Math.cos(TURN * (i + 2) * n / TABLE)),
  sine: Float64Array.from({ length: TABLE }, (_, n) => amplitude * Math.sin(TURN * (i + 2) * n / TABLE)),
}))
const outlines = new Map<number, Float32Array>()
const outlineEast = Float64Array.from({ length: TABLE }, (_, i) => Math.sin(TURN * (i / TABLE - 0.5)))
const outlineNorth = Float64Array.from({ length: TABLE }, (_, i) => Math.cos(TURN * (i / TABLE - 0.5)))

function lobesOf(seed: number): Float32Array {
  let lobes = outlines.get(seed)
  if (!lobes) {
    const rng = seeded(seed ^ 0x0c10d)
    lobes = new Float32Array(TABLE)
    for (const { cosine, sine } of harmonics) {
      const phase = TURN * rng()
      const a = Math.cos(phase) * SCATTER / rms, b = Math.sin(phase) * SCATTER / rms
      for (let i = 0; i < TABLE; i++) lobes[i] += a * cosine[i] - b * sine[i]
    }
    // Bound the seed cache to the same 512 outlines as the prototype.
    if (outlines.size >= 512) outlines.clear()
    outlines.set(seed, lobes)
  }
  return lobes
}

export function outlineOf(seed: number, amount: number, blend?: FieldCell['seedBlend']): Float32Array {
  const lobes = lobesOf(seed)
  const incoming = blend && lobesOf(blend[0])
  const table = Float32Array.from(lobes, (lobe, i) => {
    const radius = incoming && blend ? lobe + blend[1] * (incoming[i] - lobe) : lobe
    return (1 + amount * radius) ** 2
  })
  const area = table.reduce((sum, radius2) => sum + radius2, 0) / TABLE
  for (let i = 0; i < TABLE; i++) table[i] = area / table[i]
  return table
}

// Interpolation over one octant is sufficient. Use one interval per outline sample
// so angular lookup is finer than the silhouette's own interpolation.
const angles = Float64Array.from({ length: TABLE + 1 }, (_, i) => Math.atan(i / TABLE))
function angleOf(y: number, x: number): number {
  const ax = Math.abs(x), ay = Math.abs(y)
  if (!(ax || ay)) return 0
  const at = Math.min(ax, ay) / Math.max(ax, ay) * TABLE
  const i = Math.min(TABLE - 1, Math.floor(at))
  const octant = angles[i] + (angles[i + 1] - angles[i]) * (at - i)
  const quadrant = ax >= ay ? octant : Math.PI / 2 - octant
  const half = x >= 0 ? quadrant : Math.PI - quadrant
  return y >= 0 ? half : -half
}

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
  if (r <= 0 || cell.tau0 <= 0 || cell.rMinor !== undefined || distance2 >= (limit + r) ** 2) return null
  const d = Math.sqrt(distance2)
  const near = d <= r ? 90 : altitudeOf(height, d - r)
  if (near <= DOME_ALT) return null
  const east = d ? x / d : 0, north = d ? y / d : 1
  // The disc loses its visible sides as its footprint crosses the zenith.
  const off = smoothstep(1, 1.5, d / r)
  const entry = smoothstep(DOME_ALT, 2 * DOME_ALT, near)
  const outline = outlineOf(seed, entry, cell.seedBlend)
  let stretch = 1
  if (off) {
    const far = altitudeOf(height, d + r)
    const slant = Math.hypot(d, height)
    const width = 2 * Math.atan2(r, slant) * DEG
    // Near-to-far foreshortening plus the visible side, capped at a half-disc for a sheet heap.
    const eye = (near - far) / width + Math.min(0.5, vKm / (2 * r)) * d / slant
    const drawn = (geom.dome(far) - geom.dome(near)) / (2 * Math.asin(r / d) * DEG * geom.azimuthRange.period / 360)
    // Keep the relief's coordinates fixed while a cell enters the stretched dome.
    const dome = smoothstep(DOME_ALT, DOME_ALT + (near - far) / 2, near)
    stretch += Math.max(0, drawn * outlineAspect(outline, east, north) / eye - 1) * off * dome
  }
  const root = Math.sqrt(stretch)
  const size = r * Math.sqrt(1 + (OVERLAP - 1) * entry)
  const radial = size / root, across = size * root
  const widest = 1 / Math.sqrt(outline.reduce((min, value) => Math.min(min, value), Infinity))
  const reach = size * root * widest
  const polar = off * entry
  // The transverse Cartesian and polar terms have the same sign, bounding
  // the bearing and thus the sagitta of a partially polar footprint.
  const sagitta = polar > 0 && polar < 1
    ? (1 - polar) * (1 - Math.cos(Math.min(Math.PI, reach / (polar * d)))) : 0
  return { cell, d, off: polar, east, north, sagitta,
    invRadial: 1 / radial, invAcross: 1 / across, invR2: 1 / (r * r),
    reach: Math.max(r, reach), radialReach: Math.max(r, radial * widest), support2: widest * widest, outline,
    cumulus: genus === 'cu' || genus === 'cg' || genus === 'cb' }
}

/** Depth correction by ground range, with one candidate list for each raster row. */
export function seenDepth(cells: readonly FieldCell[], height: number, geom: SkyGeom) {
  const limit = groundRangeAt(height, DOME_ALT)
  const shapes = cells.map((cell) => prepare(cell, height, geom, limit)).filter((shape) => shape !== null)
  if (!shapes.length) return null
  return (range: number, altitude: number) => {
    if (altitude <= DOME_ALT) return null
    // Feather the relief edge by the one degree between the join and the cover diagnostic.
    const weight = smoothstep(DOME_ALT, DOME_ALT + 1, altitude)
    const row = shapes.filter(({ d, reach, radialReach, off, sagitta }) => {
      const offset = range - d
      if (!off) return Math.abs(offset) < reach
      return offset > -radialReach && offset < radialReach + range * sagitta
    }).map(shape => ({
      shape,
      // |sin bearing| <= |bearing|, so this rejects points outside the
      // transverse support before looking up the polar angle.
      transverseLower: range ? (1 - shape.off + shape.off * shape.d / range) * shape.invAcross : 0,
    }))
    if (!row.length) return null
    return (x: number, y: number) => {
      let delta = 0
      for (const { shape, transverseLower } of row) {
        const { cell, d, off, east, north, invRadial, invAcross, invR2, reach, support2, outline, cumulus } = shape
        const dx = x - cell.x, dy = y - cell.y
        const rr = dx * dx + dy * dy
        // The planar bound is exact when the footprint is entirely Cartesian.
        if (!off && rr >= reach * reach) continue
        const along = dx * east + dy * north, aside = dx * north - dy * east
        const u = (along + off * (range - d - along)) * invRadial
        const u2 = u * u
        const lower = aside * transverseLower
        let depth = 0
        if (u2 + lower * lower < support2) {
          const v = (off ? aside + off * (d * angleOf(aside, d + along) - aside) : aside) * invAcross
          const radius2 = u2 + v * v
          if (radius2 < support2) {
            // Rotate back to ground axes so the seed's outline does not turn as a cell crosses zenith.
            const at = (angleOf(u * east + v * north, u * north - v * east) / TURN + 0.5) * TABLE
            const i = Math.floor(at)
            const a = outline[i % TABLE], b = outline[(i + 1) % TABLE]
            depth = kernel(cell.tau0, radius2 * (a + (b - a) * (at - i)), cumulus)
          }
        }
        delta += depth - kernel(cell.tau0, rr * invR2, cumulus)
      }
      return weight * delta
    }
  }
}
