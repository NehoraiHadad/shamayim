import { smoothstep } from '../../../domain/smoothstep'
import type { IllustratedTones } from '../../model/illustratedTones'
import { labOf, lightness, rgbOfLab } from '../../model/tone'
import type { OutsideLandDesc, RGB, SeaDesc, Shine, Tones } from '../../model/types'
import { calm, papered, pigment, skied, valued } from './kit/palette'
import { facesOf } from './outsideLight'

/*
 * A town's tones as the block's inks: lit planes warm and a step up, shades cool and a step down; its lamps and air as
 * they are. The lift and the warmth are the light's: in the sun the stone is the paper's cream, under a dull sky (dusk,
 * overcast) the walls fall back to the model's own, about the ground's value, and the roofs lose their warmth with them.
 */

/** Each tone's turn (warm 1 … cool -1) and its step of value; the rest are taken as they are. */
const TURN: Partial<Record<keyof IllustratedTones, readonly [number, number]>> = {
  wall: [0.6, 0.04], lit: [0.8, 0.05], shade: [-1, -0.04], deep: [-1, -0.09], rim: [0.4, 0.04], stone: [0.6, 0.03], stoneLit: [0.9, 0.04],
  roof: [0.6, 0], roofLit: [1, 0.05], glass: [-0.4, 0], glassLit: [0, 0.03], green: [0.5, -0.02], greenLit: [0.9, 0.05], gold: [0.8, 0.12],
}
/** How far the paper shows through a lit wall. */
const PAPERED: Partial<Record<keyof IllustratedTones, number>> = { wall: 0.3, lit: 0.6, stone: 0.3, stoneLit: 0.5 }
/** A step of value fades with the light: a night's planes stay as close as they are. */
const BRIGHT = 1.3

/**
 * The stone's own cream (Oklab b, a share of it in a), by the light: the model's walls take the far ridge's blue air, the
 * hand paints the stone it is (Jerusalem's, the villages' plaster) where the light finds it.
 */
const CREAM: Partial<Record<keyof IllustratedTones, number>> = { wall: 0.026, stone: 0.03, lit: 0.032, stoneLit: 0.036, rim: 0.016 }
const CREAM_A = 0.15
/** The leaf's own green (Oklab b, a share of it in -a) where the light or the day finds it: the model's far trees take
 *  their air's teal, the hand paints them the olive of its fields, so a clump is foliage, never a ball of night. */
const LEAF: Partial<Record<keyof IllustratedTones, number>> = { green: 0.022, greenLit: 0.032 }
const LEAF_A = 0.2
/** How much of its lift and warmth a town keeps with no direct light by day (an even sky): the rest is the sun's. */
const DULL = 0.25

/** How much of the sun's lift and warmth the town's inks take: the direct light's share by day, none by night. */
export const daylit = (s: Shine): number => (1 - s.night) * (DULL + (1 - DULL) * facesOf(s).on)

/** How far (a share of the air's value) a town's darks stand out of its air: under the first it is all air, past the last all its own. */
const CLEAR = [0.1, 0.45] as const

/** The share of the hand's own ink a tone takes: the block gives back no contrast that fog or dust has taken. */
const clearOf = ({ deep, mist }: Tones): number => smoothstep(CLEAR[0], CLEAR[1], 1 - lightness(deep) / Math.max(0.05, lightness(mist)))

/** `lit`: how much of the sun's lift and warmth they take (`daylit`). */
export function inkedTones<T extends Tones>(tones: T, lit = 1): T {
  const all: Partial<IllustratedTones> = tones, out = { ...all }, clear = clearOf(tones), sun = clear * lit
  for (const [key, [turn, step]] of Object.entries(TURN) as [keyof IllustratedTones, readonly [number, number]][]) {
    const rgb = all[key]
    if (!rgb) continue
    // A lift and a warm turn are the light's; a shade's step down and its cool are the air's, whatever the light.
    const up = step > 0 ? sun : clear, warm = turn > 0 ? sun : clear
    const toward = (CREAM[key] ?? 0) * sun + (LEAF[key] ?? 0) * clear * (0.5 + 0.5 * lit)
    const stepped = creamed(valued(rgb, step * up * Math.min(1, Math.max(...rgb) * BRIGHT)), toward, LEAF[key] ? -LEAF_A : CREAM_A)
    out[key] = papered(calm(stepped, turn * warm, 1 - sun), (PAPERED[key] ?? 0) * sun)
  }
  return out as T
}

/** A colour turned warmer by `b` (Oklab), `a` the share of it in a; value held. */
function creamed(rgb: RGB, b: number, a: number): RGB {
  if (b <= 0) return rgb
  const lab = labOf(rgb)
  return rgbOfLab({ l: lab.l, a: lab.a + a * b, b: lab.b + b })
}

/** The place's own ground and its sea in the hand's inks. */
export const inkedLand = (land: OutsideLandDesc): OutsideLandDesc =>
  ({ ...land, tone: pigment(land.tone, 0.2), rim: pigment(land.rim, 0.5), stops: land.stops.map(([at, rgb]) => [at, pigment(rgb, 0.2)]) })

export const inkedSea = (sea: SeaDesc): SeaDesc => ({
  ...sea, stops: sea.stops.map(([at, rgb]) => [at, skied(rgb)]), light: skied(sea.light, 0.2), dark: skied(sea.dark, -0.4),
  shore: pigment(sea.shore, 0.5), horizon: { ...sea.horizon, rgb: skied(sea.horizon.rgb) },
  glint: sea.glint && { ...sea.glint, rgb: pigment(sea.glint.rgb, 0.4) },
})
