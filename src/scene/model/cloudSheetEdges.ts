import { hashId } from '../../data/landmarks/hash'
import { createClumpSampler } from '../../world/field/clump'
import { clumpAt } from '../../world/field/handover'
import { meanRadius } from '../../world/field/lattice'
import type { FieldLayer } from '../../world/field/types'

/*
 * The field's cells are discs; a cloud's outline is not. The sheet reads the field through a smooth noise of the layer's
 * own air (it drifts with the cells, and hands over with them at midnight), so a rim near enough to show its shape swells
 * and gives as a cloud's does, and so does the gap between two. A displacement with no mean keeps the cover.
 */

/**
 * Lobes round a mean cell and how far they stand out, in its radii: an outline of perimeter dimension 1.35 (Lovejoy 1982)
 * has a spectrum of amplitudes m^-(2 - 1.35 + 1/2), here from a cell half as wide as it is long (a second harmonic of 1/3)
 * to its third. The finer lobes are the painters' own.
 */
const LOBES = 3, DEPTH = (2 / LOBES) ** 1.15 / 3
/** The sampler's coarse octave (2/3 of it, value noise of standard deviation .21) at a sinusoid's deviation (1/√2). */
const PEAK = DEPTH * Math.SQRT1_2 / (0.21 * 2 / 3)

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
