import { seeded } from '../../data/landmarks/hash'
import type { FieldCell } from '../../world/field/types'

export const TURN = 2 * Math.PI
// Lovejoy (1982) measured perimeter dimension 1.35, giving radial amplitudes proportional
// to m^-(2.5 - 1.35). Keep the four lowest scallop modes, excluding translation and the
// elliptic and triangular modes that dominate the silhouette at cloud scale.
export const TABLE = 96
const FALL = 1.15, FIRST_MODE = 4
const modes = Array.from({ length: 4 }, (_, i) => (i + FIRST_MODE) ** -FALL)
// Bound the sum of radial amplitudes by the 20% contour-to-hull area allowance:
// (1 - excursion)^2 / (1 + excursion)^2 >= 0.8.
const excursion = (1 - Math.sqrt(0.8)) / (1 + Math.sqrt(0.8))
const amplitudeScale = excursion / modes.reduce((sum, amplitude) => sum + amplitude, 0)
const harmonics = modes.map((amplitude, i) => ({
  cosine: Float64Array.from({ length: TABLE }, (_, n) => amplitude * Math.cos(TURN * (i + FIRST_MODE) * n / TABLE)),
  sine: Float64Array.from({ length: TABLE }, (_, n) => amplitude * Math.sin(TURN * (i + FIRST_MODE) * n / TABLE)),
}))
const outlines = new Map<number, { lobes: Float32Array; table?: Float32Array }>()
export const outlineEast = Float64Array.from({ length: TABLE }, (_, i) => Math.sin(TURN * (i / TABLE - 0.5)))
export const outlineNorth = Float64Array.from({ length: TABLE }, (_, i) => Math.cos(TURN * (i / TABLE - 0.5)))

function seedOutline(seed: number) {
  let outline = outlines.get(seed)
  if (!outline) {
    const rng = seeded(seed ^ 0x0c10d)
    const lobes = new Float32Array(TABLE)
    for (const { cosine, sine } of harmonics) {
      const phase = TURN * rng()
      const a = Math.cos(phase) * amplitudeScale, b = Math.sin(phase) * amplitudeScale
      for (let i = 0; i < TABLE; i++) lobes[i] += a * cosine[i] - b * sine[i]
    }
    // Bound the seed cache to the same 512 outlines as the prototype.
    if (outlines.size >= 512) outlines.clear()
    outline = { lobes }
    outlines.set(seed, outline)
  }
  return outline
}

export function outlineOf(seed: number, blend?: FieldCell['seedBlend'], strength = 1): Float32Array {
  const outgoing = seedOutline(seed)
  if (strength < 1) return normalized(outgoing.lobes, blend && seedOutline(blend[0]).lobes, blend?.[1], strength)
  if (!blend || blend[1] <= 0) return outgoing.table ??= normalized(outgoing.lobes)
  const incoming = seedOutline(blend[0])
  if (blend[1] >= 1) return incoming.table ??= normalized(incoming.lobes)
  return normalized(outgoing.lobes, incoming.lobes, blend[1])
}

function normalized(lobes: Float32Array, incoming?: Float32Array, weight = 0, strength = 1) {
  const table = Float32Array.from(lobes, (lobe, i) => {
    const radius = incoming ? lobe + weight * (incoming[i] - lobe) : lobe
    return (1 + strength * radius) ** 2
  })
  const area = table.reduce((sum, radius2) => sum + radius2, 0) / TABLE
  for (let i = 0; i < TABLE; i++) table[i] = area / table[i]
  return table
}

// Interpolation over one octant is sufficient. Use one interval per outline sample
// so angular lookup is finer than the silhouette's own interpolation.
const angles = Float64Array.from({ length: TABLE + 1 }, (_, i) => Math.atan(i / TABLE))
export function angleOf(y: number, x: number): number {
  const ax = Math.abs(x), ay = Math.abs(y)
  if (!(ax || ay)) return 0
  const at = Math.min(ax, ay) / Math.max(ax, ay) * TABLE
  const i = Math.min(TABLE - 1, Math.floor(at))
  const octant = angles[i] + (angles[i + 1] - angles[i]) * (at - i)
  const quadrant = ax >= ay ? octant : Math.PI / 2 - octant
  const half = x >= 0 ? quadrant : Math.PI - quadrant
  return y >= 0 ? half : -half
}
