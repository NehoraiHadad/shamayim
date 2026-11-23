import { smoothstep } from '../../../../src/domain/smoothstep'
import { noiseAt, placeOf, puffTile, swellTile, wispTile } from './cloudNoise'

/*
 * How a kind of cloud is made, one hand for sheets and towers: a soft cover in, its edge carried by perspective noise out.
 * A full core and an open sky stay what they are: the noise works on the rim and, a little, on the core's light.
 */

/** How far a soft cover is spread (px overhead); how far the noise carries its edge; the noise tile's width (px) and its
 *  stretch along the wind; the puffs' part in the noise (the rest wisps); the rim's softness; how much the noise thins it. */
export interface Make { soft: number; carry: number; tile: number; along: number; puff: number; rim: number; thin: number }
export const HEAP: Make = { soft: 10, carry: 0.95, tile: 230, along: 1.1, puff: 0.62, rim: 0.56, thin: 0.3 }
export const FLEECE: Make = { soft: 10, carry: 1.15, tile: 170, along: 1.15, puff: 0.6, rim: 0.34, thin: 0.34 }
export const VEIL: Make = { soft: 14, carry: 1, tile: 300, along: 3, puff: 0, rim: 1, thin: 0.75 }
export const DECK: Make = { soft: 9, carry: 1, tile: 210, along: 1.4, puff: 0.5, rim: 0.44, thin: 0.12 }

/** How far the rim stands back from the faintest cover, so a mass keeps its mean cover. */
const BIAS = 0.06
/** A cloud's heads, big and small: the noise's rate, how far toward the light a slope is taken (tile widths), its part. */
const HEADS = [[0.55, 0.1, 0.8], [1.25, 0.07, 0.3]] as const
/** From this cover to this the inside is whole: no noise lets the sky through it. */
const WHOLE = [0.6, 0.95] as const

export interface Grain { noise: number; wisp: number; relief: number }

/** A row's noise: its size steps down the sky in octaves, two blended (a size sliding with the row would shear to streaks). */
export function grainRows(make: Make, seed: number) {
  const at0 = placeOf(seed), puffs = puffTile(), wisps = wispTile(), swell = swellTile()
  const out: Grain = { noise: 0, wisp: 0, relief: 0 }
  return (scale: number) => {
    const level = Math.min(2.999, -Math.log2(0.1 + 0.9 * Math.min(1, scale))), step = Math.floor(level), part = level - step
    const one = (tile: Float32Array, l: number, x: number, y: number, rate: number, a: number, b: number) => {
      const size = make.tile * 2 ** -l
      return noiseAt(tile, x * rate / (size * make.along) + a + at0.u + 0.37 * l, y * rate * (1 + 0.45 * l) / size + b + at0.v + 0.61 * l)
    }
    const read = (tile: Float32Array, x: number, y: number, rate: number, a: number, b: number) =>
      one(tile, step, x, y, rate, a, b) * (1 - part) + one(tile, step + 1, x, y, rate, a, b) * part
    /** At a place (px), the light's unit direction in the picture (toward it). */
    return (x: number, y: number, ux: number, uy: number): Grain => {
      const bend = read(wisps, x, y, 0.5, 0.31, 0.17) - 0.5
      out.wisp = read(wisps, x, y, 1, bend * 0.22, bend * 0.16)
      const puff = make.puff ? read(puffs, x, y, 1.1, bend * 0.1 + 0.2, -bend * 0.08) : 0
      out.noise = out.wisp + (puff - out.wisp) * make.puff
      // A head's slope rising toward the light is its far side.
      out.relief = 0
      for (const [rate, slope, part] of HEADS) {
        const head = (a: number, b: number) => read(swell, x, y, rate, bend * 0.05 + a, -bend * 0.04 + b)
        out.relief += part * (head(slope * ux, slope * uy) - head(0, 0))
      }
      return out
    }
  }
}

/** The drawn cover and the thickness of a soft cover `a`; `flat` 0–1: an underside, cut straight by the level it condenses at. */
export function bodyOf(make: Make, a: number, g: Grain, flat: number): readonly [alpha: number, thick: number] {
  const carry = make.carry * (1 - 0.7 * flat) * Math.min(1, 4.4 * a * (1 - a))
  const rimmed = a + carry * (g.noise - 0.5) - BIAS
  // Here crisp, there soft: no cloud has one edge all round.
  const rim = make.rim * (0.55 + 0.9 * g.wisp) * (1 - 0.35 * flat)
  const d = smoothstep(0, 1, Math.max(0, rimmed - BIAS) / rim)
  const open = 1 - smoothstep(WHOLE[0], WHOLE[1], a), hollow = 1 - g.noise
  return [d * (1 - make.thin * 0.75 * open * hollow ** 1.4), Math.min(1, Math.max(0, rimmed)) * (1 - make.thin * (0.25 + 0.75 * open) * hollow)]
}
