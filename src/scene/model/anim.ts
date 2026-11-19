import { seeded } from '../../data/landmarks/hash'
import type { AnimSpec, Pulse } from './types'

/**
 * The animation of a layer at `phase` (seconds from the loop's start, never the clock), applied when its cached canvas is
 * laid into the surface: how far it has drifted and how bright it is. Pure functions of the spec and the phase, so a frame
 * is the same pixels whenever it is drawn (the anidoodle contract).
 */

/** How far (surface px, in `0…period`) a drifting layer has moved at `phase`; 0 without a drift. */
export function driftAt(spec: AnimSpec | undefined, phase: number): number {
  if (!spec?.speed || !spec.period) return 0
  const d = (spec.speed * phase) % spec.period
  return d < 0 ? d + spec.period : d + 0
}

/** A flash's own light over time (s since it struck): a stroke, a dip, a weaker return stroke, then the fade. */
function stroke(t: number, twice: boolean): number {
  if (t < 0) return 0
  if (t < 0.06) return 1
  if (t < 0.12) return 1 - 0.75 * ((t - 0.06) / 0.06)
  if (twice && t < 0.2) return 0.25 + 0.55 * Math.sin(((t - 0.12) / 0.08) * Math.PI)
  const from = twice ? 0.2 : 0.12
  return t < from + 0.25 ? 0.25 * (1 - (t - from) / 0.25) : 0
}

/** The schedule repeats after this long (s): long enough that no one sees the pattern. */
const CYCLE = 600

/** The strike times (s) within one cycle and whether each strikes twice, seeded. */
export function strikes(pulse: Pulse): { at: number; twice: boolean }[] {
  const r = seeded(pulse.seed)
  const out: { at: number; twice: boolean }[] = []
  let t = pulse.first
  while (t < CYCLE) {
    out.push({ at: t, twice: r() < 0.4 })
    t += pulse.every[0] + (pulse.every[1] - pulse.every[0]) * r()
  }
  return out
}

/** The flash's alpha at `phase` (0 between flashes); 1 for a layer that does not pulse. */
export function flashAt(spec: AnimSpec | undefined, phase: number): number {
  const pulse = spec?.pulse
  if (!pulse) return 1
  const list = strikes(pulse)
  const t = phase % CYCLE
  let alpha = 0
  for (const s of list) {
    if (s.at > t) break
    alpha = Math.max(alpha, stroke(t - s.at, s.twice))
  }
  return alpha
}
