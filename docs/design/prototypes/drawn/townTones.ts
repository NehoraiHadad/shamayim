import type { RGB, Tones } from '../../../../src/scene/model/types'
import { pigment, valued } from './palette'

/* A town's tones as the hand mixes them: lit planes warm and a step up, shades cool and a step down; lamps as they are. */

/** Each tone's turn (warm +, cool -) and its step of value; the rest are taken as they are. */
const TURN: Partial<Record<keyof Tones, readonly [number, number]>> = {
  wall: [0.5, 0.05], lit: [0.9, 0.09], shade: [-0.9, -0.03], deep: [-1, -0.05], rim: [0.4, 0.04], stone: [0.6, 0.05], stoneLit: [1, 0.07],
  roof: [0.5, 0], roofLit: [1, 0.05], glass: [-0.4, 0], glassLit: [0, 0.03], green: [-0.1, -0.02], greenLit: [0.6, 0.05], gold: [0.8, 0.12],
}

const held = new WeakMap<Tones, Tones>()

export function mixed(t: Tones): Tones {
  const known = held.get(t)
  if (known) return known
  const out = { ...t }
  for (const [key, [turn, step]] of Object.entries(TURN) as [keyof Tones, readonly [number, number]][]) {
    // A step of value fades with the light: a night's planes stay close, as they are.
    const rgb = t[key] as RGB, bright = Math.min(1, Math.max(...rgb) * 1.3)
    out[key] = pigment(valued(rgb, step * bright), turn)
  }
  held.set(t, out)
  return out
}
