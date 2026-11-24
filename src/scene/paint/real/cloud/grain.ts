import { smoothstep } from '../../../../domain/smoothstep'
import type { LayerOf } from '../../../model/types'
import { noiseAt, placeOf, puffTile, swellTile, wispTile } from './noise'

/*
 * How a kind of cloud is made: a soft cover in, its edge carried by perspective noise out. A full core and an open sky stay
 * what they are: the noise works on the rim and, a little, on the core's light.
 */

/** How far a soft cover is spread (px overhead); how far the noise carries its edge; the noise tile's width (px) and its
 *  stretch across; the puffs' part in the noise (the rest wisps); the rim's softness; how much the noise thins it. */
export interface Make { soft: number; carry: number; tile: number; along: number; puff: number; rim: number; thin: number }
const HEAP: Make = { soft: 10, carry: 0.95, tile: 230, along: 1.1, puff: 0.62, rim: 0.82, thin: 0.3 }
const FLEECE: Make = { soft: 10, carry: 1.15, tile: 170, along: 1.15, puff: 0.6, rim: 0.74, thin: 0.34 }
const DECK: Make = { soft: 10, carry: 1, tile: 210, along: 1.4, puff: 0.5, rim: 0.74, thin: 0.2 }
/** A high veil has no edge to carry: the grain only combs it. */
const VEIL: Make = { soft: 6, carry: 0, tile: 300, along: 3, puff: 0, rim: 1, thin: 0 }

/** The make of a sheet's cloud, a closed deck's (`open` 0) to its genus's own (1). */
export function makeOf({ lattice, genus }: LayerOf<'cloudSheet'>, open: number): Make {
  if (lattice === 'high') return VEIL
  const own = genus === 'st' || genus === 'ns' || genus === 'as' ? DECK : lattice === 'mid' ? FLEECE : HEAP
  const mixed = { ...DECK }
  for (const key of Object.keys(mixed) as (keyof Make)[]) mixed[key] += (own[key] - mixed[key]) * open
  return mixed
}

/** How far the rim stands back from the faintest cover, so a mass keeps its mean cover. */
const BIAS = 0.06
/** A cloud's heads, big and small: the noise's rate, how far toward the light a slope is taken (tile widths), its part. */
const HEADS = [[0.62, 0.1, 0.8], [1.35, 0.07, 0.36]] as const
/** The fine torn edge over the broad one: its rate and its part; how much of a core's thickness the noise takes, for the light in it. */
const FINE_RATE = 2.7, FINE = 0.7, HOLLOW = 0.5
/** From this cover to this the inside is whole: no noise lets the sky through it. */
const WHOLE = [0.6, 0.95] as const

/** A cloud's noise by place (px). A row first: its size steps down the sky in octaves, two blended (a size sliding with the
 *  row would shear to streaks). */
export function cloudGrain(make: Make, seed: number) {
  const { u, v } = placeOf(seed), puffs = puffTile(), wisps = wispTile(), swell = swellTile()
  let part = 0, ax = 1, ay = 1, au = 0, av = 0, bx = 1, by = 1, bu = 0, bv = 0
  const read = (tile: Float32Array, x: number, y: number, rate: number, a: number, b: number) => {
    const near = noiseAt(tile, x * rate * ax + a + au, y * rate * ay + b + av)
    return part ? near + (noiseAt(tile, x * rate * bx + a + bu, y * rate * by + b + bv) - near) * part : near
  }
  return {
    /** The row's scale: 1 overhead, small far off. */
    row(scale: number) {
      const level = Math.min(2.999, -Math.log2(0.1 + 0.9 * Math.min(1, scale))), step = Math.floor(level), size = make.tile * 2 ** -step
      part = level - step
      ax = 1 / (size * make.along)
      bx = 2 * ax
      ay = (1 + 0.45 * step) / size
      by = (2 * (1.45 + 0.45 * step)) / size
      au = u + 0.37 * step
      bu = au + 0.37
      av = v + 0.61 * step
      bv = av + 0.61
    },
    /** What bends the noise there, about 0. */
    bend: (x: number, y: number) => read(wisps, x, y, 0.5, 0.31, 0.17) - 0.5,
    wisp: (x: number, y: number, bend: number) => read(wisps, x, y, 1, bend * 0.22, bend * 0.16),
    /** The whole noise, over its `wisp`. */
    noise: (x: number, y: number, bend: number, wisp: number) =>
      wisp + (read(puffs, x, y, 1.1, bend * 0.1 + 0.2, -bend * 0.08) - wisp) * make.puff,
    /** The fine noise of a rim, about 0. */
    fine: (x: number, y: number, bend: number) => FINE * (read(wisps, x, y, FINE_RATE, bend * 0.3, bend * 0.2) - 0.5),
    /** How far the heads face away from the light at (ux, uy): a slope that rises toward it is a head's far side. */
    relief(x: number, y: number, ux: number, uy: number, bend: number) {
      let sum = 0
      for (const [rate, slope, weight] of HEADS) {
        sum += weight * (read(swell, x, y, rate, bend * 0.05 + slope * ux, slope * uy - bend * 0.04)
          - read(swell, x, y, rate, bend * 0.05, -bend * 0.04))
      }
      return sum
    },
  }
}

const openOf = (a: number) => 1 - smoothstep(WHOLE[0], WHOLE[1], a)
const edgeOf = (make: Make, a: number, noise: number, flat: number) =>
  a + make.carry * (1 - 0.7 * flat) * Math.min(1, 4.4 * a * (1 - a)) * (noise - 0.5) - BIAS

/** How thick a soft cover `a` is there (0–1); `flat` 0–1: an underside, cut straight by the level it condenses at. */
export function thickOf(make: Make, a: number, noise: number, flat: number): number {
  return Math.min(1, Math.max(0, edgeOf(make, a, noise, flat))) * (1 - Math.max(HOLLOW, make.thin * openOf(a)) * (1 - noise))
}

/** The drawn cover there: `noise` with its fine one. Here crisp, there soft (`wisp`): no cloud has one edge all round. */
export function coverOf(make: Make, a: number, noise: number, wisp: number, flat: number): number {
  const rim = make.rim * (0.55 + 0.9 * wisp) * (1 - 0.35 * flat)
  const drawn = smoothstep(0, 1, Math.max(0, edgeOf(make, a, noise, flat) - BIAS) / rim), hollow = Math.max(0, 1 - noise)
  return drawn * (1 - make.thin * 0.75 * openOf(a) * hollow * Math.sqrt(hollow))
}
