import { smoothstep } from '../../../domain/smoothstep'
import type { IllustratedTones } from '../../model/illustratedTones'
import { labOf } from '../../model/tone'
import type { OutsideLandDesc, RGB, SeaDesc, Tones } from '../../model/types'
import { calm, papered, pigment, skied, valued } from './kit/palette'

/* A town's tones as the block's inks: lit planes warm and a step up, shades cool and a step down; its lamps and air as they are. */

/** Each tone's turn (warm 1 … cool -1) and its step of value; the rest are taken as they are. */
const TURN: Partial<Record<keyof IllustratedTones, readonly [number, number]>> = {
  wall: [0.6, 0.04], lit: [0.8, 0.05], shade: [-1, -0.04], deep: [-1, -0.09], rim: [0.4, 0.04], stone: [0.6, 0.03], stoneLit: [0.9, 0.04],
  roof: [0.6, 0], roofLit: [1, 0.05], glass: [-0.4, 0], glassLit: [0, 0.03], green: [-0.1, -0.02], greenLit: [0.6, 0.05], gold: [0.8, 0.12],
}
/** How far the paper shows through a lit wall. */
const PAPERED: Partial<Record<keyof IllustratedTones, number>> = { wall: 0.3, lit: 0.6, stone: 0.3, stoneLit: 0.5 }
/** A step of value fades with the light: a night's planes stay as close as they are. */
const BRIGHT = 1.3

/** The tan of an air (Oklab b past what is rose) that dust is told by, and what it takes of a plane's step of value. */
const TAN = [0.01, 0.03] as const, FLAT = 0.5

function dustIn(air: RGB): number {
  const { a, b } = labOf(air)
  return smoothstep(TAN[0], TAN[1], b - 1.5 * Math.max(0, a))
}

export function inkedTones<T extends Tones>(tones: T): T {
  const all: Partial<IllustratedTones> = tones, out = { ...all }, dust = dustIn(tones.mist)
  for (const [key, [turn, step]] of Object.entries(TURN) as [keyof IllustratedTones, readonly [number, number]][]) {
    const rgb = all[key]
    if (rgb) out[key] = papered(calm(valued(rgb, step * (1 - FLAT * dust) * Math.min(1, Math.max(...rgb) * BRIGHT)), turn, dust), (PAPERED[key] ?? 0) * (1 - dust))
  }
  return out as T
}

/** The place's own ground and its sea in the hand's inks. */
export const inkedLand = (land: OutsideLandDesc): OutsideLandDesc =>
  ({ ...land, tone: pigment(land.tone, 0.2), rim: pigment(land.rim, 0.5), stops: land.stops.map(([at, rgb]) => [at, pigment(rgb, 0.2)]) })

export const inkedSea = (sea: SeaDesc): SeaDesc => ({
  ...sea, stops: sea.stops.map(([at, rgb]) => [at, skied(rgb)]), light: skied(sea.light, 0.2), dark: skied(sea.dark, -0.4),
  shore: pigment(sea.shore, 0.5), horizon: { ...sea.horizon, rgb: skied(sea.horizon.rgb) },
  glint: sea.glint && { ...sea.glint, rgb: pigment(sea.glint.rgb, 0.4) },
})
