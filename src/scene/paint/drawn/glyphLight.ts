import type { RGB } from '../../../world/types'
import type { DrawnTones } from '../../model/drawnTones'
import { css, mix, type Ctx2D } from '../hand'

/** Keep the union of the two falloffs' stops fixed and reverse the samples for right light. */
export function roundGradient(c: Ctx2D, t: DrawnTones, l: number, x0: number, x1: number, term: number, wall: RGB, lit: RGB) {
  const g = c.createLinearGradient(x0, 0, x1, 0)
  // Even (the sky's light from above: a little light down the middle, both edges turning away) blended into the side
  // light's falloff by `k`: the same stops for both, so the body turns with the light.
  const even: [number, RGB][] = [[0, mix(wall, t.shade, 0.35)], [0.5, mix(wall, t.rim, 0.15)], [1, mix(wall, t.shade, 0.35)]]
  const sided: [number, RGB][] = [[0, mix(lit, t.rim, 0.4)], [0.18, lit], [term * 0.7, wall], [term, mix(wall, t.shade, 0.7)],
    [0.9, t.shade], [1, t.refl]]
  const at = (stops: [number, RGB][], p: number): RGB => {
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (p - stops[i - 1][0]) / Math.max(1e-6, stops[i][0] - stops[i - 1][0]))
    }
    return stops[stops.length - 1][1]
  }
  for (const p of [...new Set([0, 0.18, 0.35, 0.5, term * 0.7, term, 0.9, 0.1, 0.82, 1 - term * 0.7, 1 - term, 1])].sort((a, b) => a - b)) {
    g.addColorStop(p, css(mix(at(even, p), at(sided, l < 0 ? 1 - p : p), Math.abs(l))))
  }
  return g
}
