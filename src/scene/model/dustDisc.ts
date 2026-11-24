import { smoothstep } from '../../domain/smoothstep'
import { atLuminance, luminanceOf } from './cloudChromaticity'
import { srgbRgbToLinear } from './landRadiance'
import { mixLight } from './tone'
import type { RGB } from './types'

// Beer extinction of a 1.6e9 cd/m² photosphere gives ~2e5 cd/m² at τ=9
// and ~1e4 cd/m² at τ=12, comparable to a bright 3e3–1e4 cd/m² sky.
const BRIGHT_DEPTH = 9
const SKY_DEPTH = 12
// Keep a small positive display contrast against even the brightest sky band.
const HORIZON_RATIO = 1.02

/** Legacy disc fade under the mean cloud veil, shared with the beam restoration. */
export const sunDiscAlpha = (veil: number): number => Math.max(0.1, 1 - 0.97 * veil ** 0.7)

/** Display colour of an unveiled solar core before cloud opacity is applied. */
export function dustDiscColour(core: RGB, local: RGB, horizonY: number, slantDepth: number, bandWeight: number): RGB {
  if (!bandWeight) return core
  const coreY = luminanceOf(core)
  const visible = 1 - smoothstep(BRIGHT_DEPTH, SKY_DEPTH, slantDepth)
  const target = Math.min(1, Math.max(coreY, luminanceOf(local), horizonY * HORIZON_RATIO))
  const bright = atLuminance(srgbRgbToLinear(core), target)
  return mixLight(core, mixLight(local, bright, visible), bandWeight)
}
