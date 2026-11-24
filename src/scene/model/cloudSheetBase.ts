import { smoothstep } from '../../world/field/genus'
import type { FieldLayer } from '../../world/field/types'
import { sheetFootprint, type Grid } from './cloudSheetGrid'
import { DIFFUSE_EXTINCTION } from './cloudSheetMath'
import { sheetTexture } from './cloudSheetTexture'

/** Look. How much of a thick base's own variation is seen: the light spreads sideways on its way down through the cloud, and
 *  evens out a good half of what the columns would show alone (radiative smoothing, Marshak et al. 1995). */
const BASE_CONTRAST = 0.4

/**
 * The light of a thick open cloud's base against its mean (1), per node: what comes through a column as deep as that goes as
 * 1 / (1 + kτ), so it falls as the column's liquid water grows (its texture, `texel`, and its own columns', some hundreds of
 * metres wide), the more the thicker it is. Nothing of it in a thin cloud, whose tone and veil show its texture, nor in a
 * closing deck; none on the whole, as it is drawn.
 */
export function baseSource(grid: Grid, layer: FieldLayer, seed: number, angularStep: number, texel: (index: number) => number): number[] {
  const { xs, ys, ranges, east, north, tau, slant, fade } = grid, cols = xs.length
  const contrast = BASE_CONTRAST * (1 - smoothstep(0.6, 0.95, layer.cover))
  const thick = new Array<number>(ys.length * cols).fill(0), out = thick.slice()
  let sum = 0, area = 0
  if (contrast) for (let row = 0; row < ys.length; row++) {
    const height = (ys[Math.min(ys.length - 1, row + 1)] - ys[Math.max(0, row - 1)]) / 2
    const column = sheetTexture('base', layer, seed)(sheetFootprint(ranges, row, angularStep))
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col, depth = DIFFUSE_EXTINCTION * tau[i] * slant[row] * (1 - fade[row])
      if (!depth) continue
      // Once for how the light moves with the depth, once for the share of it the cloud's own tone no longer moves with.
      thick[i] = (depth / (1 + depth)) ** 2
      out[i] = -Math.log(Math.max(0.1, texel(i) * column(ranges[row] * east[col], ranges[row] * north[col])))
      sum += height * thick[i] * out[i]
      area += height * thick[i]
    }
  }
  const mean = area && sum / area
  return out.map((value, i) => 1 + contrast * thick[i] * (value - mean))
}
