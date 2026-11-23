import type { RGB } from '../../../../../world/types'
import { css, type Ctx2D } from '../../base/hand'

/** Interpolate samples of a curved receiver across its projected cross-section. */
export function sectorGradient(c: Ctx2D, x0: number, x1: number, sectors: readonly RGB[]) {
  const g = c.createLinearGradient(x0, 0, x1, 0)
  sectors.forEach((tone, i) => g.addColorStop(i / (sectors.length - 1), css(tone)))
  return g
}
