import { hashId } from '../../data/landmarks/hash'
import { createClumpSampler } from '../../world/field/clump'
import { clumpAt } from '../../world/field/handover'
import { meanRadius } from '../../world/field/lattice'
import type { FieldLayer } from '../../world/field/types'

/*
 * The field's cells are discs; a cloud's outline is not. The sheet reads the field through a smooth noise of the layer's
 * own air (it drifts with the cells, and hands over with them at midnight), so a rim near enough to show its shape swells
 * and gives as a cloud's does, and so does the gap between two.
 *
 * One cell may gain or lose ground by it, the layer does not: each place reads the field at a place its own noise chose,
 * which is independent of the field, and a field that is the same everywhere on average covers as much there as here. So
 * no Jacobian is due: the mean of what is read at any place is the field's own (`cloudSheetSeen.test.ts` holds it to 1 %).
 */

/** Lovejoy's (1982) perimeter dimension of clouds, 1–1000 km: an outline with amplitudes m^-(2 - D + 1/2) at its m lobes. */
const DIMENSION = 1.35
/** Look. The outermost lobes drawn: two would be a mere oval, finer ones are the painters' own. */
const LOBES = 3
/** Look. How far the spectrum's first, two lobes, stands out in radii: a cell half as wide as it is long (1 - a over 1 + a). */
const OVAL = 1 / 3
const DEPTH = OVAL * (2 / LOBES) ** (2.5 - DIMENSION)
/** Value noise's standard deviation: a uniform corner's, 1/√12, by the mean square weight of its four corners, (26/35)². */
const VALUE_NOISE = Math.sqrt(1 / 12) * 26 / 35
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

/** How far (km) the field's outlines are moved at a place of the layer. */
export function edgeNoise(placeId: string, layer: FieldLayer, minute: number) {
  const radius = meanRadius(layer.lattice, 1), amplitude = PEAK * radius
  const sampler = samplerOf(placeId, layer.lattice, 2 * Math.PI * radius / LOBES)
  const noise = clumpAt(layer, minute, (x, y) => sampler(x, y, 0))
  return { radius, at: (x: number, y: number) => amplitude * (noise(x, y) - 0.5) }
}
