import { hashId } from '../../data/landmarks/hash'
import { createClumpSampler } from './clump'
import { smoothstep } from './genus'
import { clumpAt } from './handover'
import { meanRadius } from './lattice'
import type { FieldLayer } from './types'

/*
 * The field's cells are discs; a cloud's outline is not. The sheet, and the sun's ray to the eye, read the field through a
 * smooth noise of the layer's own air (it drifts with the cells, and hands over with them at midnight), so a rim near enough
 * to show its shape swells and gives as a cloud's does, and so does the gap between two. No camera is asked.
 *
 * One cell may gain or lose ground by it, the layer does not: each place reads the field at a place its own noise chose,
 * which is independent of the field, and a field that is the same everywhere on average covers as much there as here. So
 * no Jacobian is due: the mean of what is read at any place is the field's own (`cloudSheetSeen.test.ts` holds it to 1 %).
 */

/** Look. The altitudes (deg) an outline is its cells' own at, and from which it is all the air's: lower, a lobe is foreshortened
 *  past showing. */
export const OUTLINE_ALT = 22, LOBED_ALT = 33
/** Lovejoy's (1982) perimeter dimension of clouds, 1–1000 km: an outline with amplitudes m^-(2 - D + 1/2) at its m lobes. */
const DIMENSION = 1.35
/** Look. The outermost lobes drawn: two would be a mere oval, finer ones are the painters' own. */
const LOBES = 3
/** Look. How far the spectrum's first, two lobes, stands out in radii: a cell half as wide as it is long (1 - a over 1 + a). */
const OVAL = 1 / 3
const DEPTH = OVAL * (2 / LOBES) ** (2.5 - DIMENSION)
/** Value noise's standard deviation: a uniform corner's, 1/√12, by the mean square weight of its four, (26/35)²: .214. */
const VALUE_NOISE = 0.21
/** The sampler's coarse octave (2/3 of it) brought to the deviation of a sinusoid that deep (1/√2 of its peak). */
const PEAK = DEPTH * Math.SQRT1_2 / (VALUE_NOISE * 2 / 3)

const samplers = new Map<string, ReturnType<typeof createClumpSampler>>()

function samplerOf(placeId: string, lattice: FieldLayer['lattice'], wavelength: number) {
  const key = `${placeId}:edge:${lattice}`
  let sampler = samplers.get(key)
  if (!sampler) {
    if (samplers.size >= 32) samplers.delete(samplers.keys().next().value!)
    samplers.set(key, sampler = createClumpSampler(hashId(key), wavelength))
  }
  return sampler
}

interface EdgeNoise {
  /** How far (km) the field's outlines are moved at a place of the layer, and the most they are anywhere. */
  at(x: number, y: number): number
  most: number
  /** The share of it a ray at that range (km) and altitude (deg) is moved by along itself, for each km of its range. */
  along(range: number, altitude: number): number
}

/** A layer's noise at the minute last asked for: every ray and sheet of a frame reads the same one. */
const latest = new WeakMap<FieldLayer, { placeId: string; minute: number; noise: EdgeNoise }>()

export function edgeNoise(placeId: string, layer: FieldLayer, minute: number): EdgeNoise {
  const known = latest.get(layer)
  if (known?.minute === minute && known.placeId === placeId) return known.noise
  const noise = noiseAt(placeId, layer, minute)
  latest.set(layer, { placeId, minute, noise })
  return noise
}

function noiseAt(placeId: string, layer: FieldLayer, minute: number): EdgeNoise {
  const radius = meanRadius(layer.lattice, 1), amplitude = PEAK * radius
  const sampler = samplerOf(placeId, layer.lattice, 2 * Math.PI * radius / LOBES)
  const noise = clumpAt(layer, minute, (x, y) => sampler(x, y, 0))
  return {
    at: (x: number, y: number) => amplitude * (noise(x, y) - 0.5),
    // The sampler's values are 0 to 1.
    most: amplitude / 2,
    // Along the ray: the projection draws its levels straight. Overhead, where every ray meets, it dies away.
    along: (range: number, altitude: number) => smoothstep(OUTLINE_ALT, LOBED_ALT, altitude) / Math.max(range, radius),
  }
}
