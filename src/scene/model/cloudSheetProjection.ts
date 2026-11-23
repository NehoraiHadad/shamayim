import { isConvective, smoothstep } from '../../world/field/genus'
import { altitudeOf } from '../../world/field/project'
import type { FieldCell } from '../../world/field/types'
import { DOME_ALT, type SkyGeom } from './sky'
import { outlineEast, outlineNorth, outlineOf, TABLE } from './cloudSheetOutline'

const DEG = 180 / Math.PI

/** Measure support and aspect together once per cell, before visiting rows. */
function outlineBounds(outline: Float32Array, east: number, north: number) {
  let near = 0, far = 0, left = 0, right = 0
  let widest = 0
  for (let i = 0; i < TABLE; i++) {
    const radius = 1 / Math.sqrt(outline[i])
    widest = Math.max(widest, radius)
    const along = (outlineEast[i] * east + outlineNorth[i] * north) * radius
    const across = (outlineEast[i] * north - outlineNorth[i] * east) * radius
    near = Math.min(near, along)
    far = Math.max(far, along)
    left = Math.min(left, across)
    right = Math.max(right, across)
  }
  return { aspect: (far - near) / (right - left), widest }
}

export function prepare(cell: FieldCell, height: number, geom: SkyGeom) {
  const { x, y, r, vKm, genus, seed } = cell
  const distance2 = x * x + y * y
  if (r <= 0 || cell.tau0 <= 0 || cell.rMinor !== undefined) return null
  const d = Math.sqrt(distance2)
  const near = d <= r ? 90 : altitudeOf(height, d - r)
  if (near <= DOME_ALT) return null
  const east = d ? x / d : 0, north = d ? y / d : 1
  // The disc loses its visible sides as its footprint crosses the zenith.
  // Reach full strength by the centre's crossing. The half-span sets the
  // onset, and the resulting outline applies on both sides of the join.
  const centre = altitudeOf(height, d)
  const weight = smoothstep(DOME_ALT - (near - centre), DOME_ALT, centre)
  const sided = smoothstep(1, 1.5, d / r)
  const off = weight * sided
  const outline = outlineOf(seed, cell.seedBlend, weight)
  const { aspect, widest } = outlineBounds(outline, east, north)
  const cumulus = isConvective(genus)
  let stretch = 1
  if (off) {
    const far = altitudeOf(height, d + r)
    const slant = Math.hypot(d, height)
    const width = 2 * Math.atan2(r, slant) * DEG
    // Add the projected side of the actual cloud column to the foreshortened footprint.
    const eye = (near - far) / width + vKm / (2 * r) * d / slant
    const widthPx = 2 * r / d * DEG * geom.azimuthRange.period / 360
    const drawn = (geom.dome(far) - geom.dome(near)) / widthPx
    // Allow one high-sky cellular interval for interpolation at the two edges.
    const margin = Math.abs(geom.dome(30) - geom.dome(90)) / (12 * widthPx)
    stretch += Math.max(0, drawn * aspect / Math.min(1 / (1 + margin), eye) - 1) * off
  }
  const root = Math.sqrt(stretch)
  const radial = r / root, across = r * root
  const reach = across * widest
  const polar = off
  // The transverse Cartesian and polar terms have the same sign, bounding
  // the bearing and thus the sagitta of a partially polar footprint.
  const sagitta = polar > 0 && polar < 1
    ? (1 - polar) * (1 - Math.cos(Math.min(Math.PI, reach / (polar * d)))) : 0
  // A quadratic shear flattens the round base to second order at its centre.
  const shear = cumulus ? smoothstep(0, 1, weight) / 2 * sided : 0
  const radialReach = Math.max(r, radial * (widest + shear * widest * widest))
  return { cell, shear, d, off: polar, east, north, sagitta, reach, bearing: Math.atan2(x, y),
    invRadial: 1 / radial, invAcross: 1 / across, invR2: 1 / (r * r),
    radialReach, support2: widest * widest, outline, cumulus }
}

export type Shape = NonNullable<ReturnType<typeof prepare>>
