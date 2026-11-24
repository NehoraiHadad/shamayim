import { labOf, toLinear, toSrgb } from '../scene/model/tone'
import type { RGB } from '../world/types'

/** The furthest (Oklab dE) a row's mean colour of a style's sky base may stand from the default base's of the same desc. */
export const ROW_DE = 0.01

/** A raster of 1 px rows, RGBA bytes (`ImageData`). */
export interface Raster { data: ArrayLike<number>; width: number; height: number }

/** The mean colour of a row as the eye takes it from afar: in linear light. */
function rowMean({ data, width }: Raster, y: number): RGB {
  const sum = [0, 0, 0]
  for (let i = y * width * 4; i < (y + 1) * width * 4; i += 4) for (let c = 0; c < 3; c++) sum[c] += toLinear(data[i + c] / 255)
  return [toSrgb(sum[0] / width), toSrgb(sum[1] / width), toSrgb(sum[2] / width)]
}

/** The row of a base whose mean colour stands furthest from the default base's, and by how much (Oklab dE). */
export function worstRow(base: Raster, plain: Raster): { y: number; dE: number } {
  if (base.width !== plain.width || base.height !== plain.height) throw new Error('two rasters of one size')
  const worst = { y: 0, dE: 0 }
  for (let y = 0; y < base.height; y++) {
    const a = labOf(rowMean(base, y)), b = labOf(rowMean(plain, y))
    const dE = Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b)
    if (dE > worst.dE) Object.assign(worst, { y, dE })
  }
  return worst
}
