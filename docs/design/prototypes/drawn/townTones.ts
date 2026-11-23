import type { IllustratedTones } from '../../../../src/scene/model/illustratedTones'
import type { Tones } from '../../../../src/scene/model/types'
import { papered, pigment, valued } from './palette'

/* A town's tones as the hand mixes them: lit planes warm and a step up, shades cool and a step down; lamps as they are. */

/** Each tone's turn (warm +, cool -) and its step of value; the rest are taken as they are. */
const TURN: Partial<Record<keyof IllustratedTones, readonly [number, number]>> = {
  wall: [0.6, 0.09], lit: [0.8, 0.08], shade: [-1, -0.04], deep: [-1, -0.09], rim: [0.4, 0.04], stone: [0.6, 0.05], stoneLit: [0.9, 0.06],
  roof: [0.6, 0], roofLit: [1, 0.05], glass: [-0.4, 0], glassLit: [0, 0.03], green: [-0.1, -0.02], greenLit: [0.6, 0.05], gold: [0.8, 0.12],
}

/** How far the paper shows through a lit wall. */
const PAPERED: Partial<Record<keyof IllustratedTones, number>> = { wall: 0.5, lit: 0.8, stone: 0.5, stoneLit: 0.75 }

const held = new WeakMap<Tones, Tones & Partial<IllustratedTones>>()

export function mixed(t: Tones): Tones & Partial<IllustratedTones> {
  const known = held.get(t)
  if (known) return known
  const all: Partial<IllustratedTones> = t, out: Tones & Partial<IllustratedTones> = { ...t }
  for (const [key, [turn, step]] of Object.entries(TURN) as [keyof IllustratedTones, readonly [number, number]][]) {
    // A step of value fades with the light: a night's planes stay close, as they are.
    const rgb = all[key]
    if (!rgb) continue
    const bright = Math.min(1, Math.max(...rgb) * 1.3)
    out[key] = papered(pigment(valued(rgb, step * bright), turn), PAPERED[key] ?? 0)
  }
  held.set(t, out)
  return out
}
