import type { LayerOf } from '../../../model/types'

/**
 * A sheet's raster as the dusty air before it lets it through (`through`, per row of `ys`): its alpha alone, so it fades into
 * the sky behind it. In place; clean air leaves it as it is.
 */
export function throughAir(data: Uint8ClampedArray, w: number, h: number, { ys, through }: Pick<LayerOf<'cloudSheet'>, 'ys' | 'through'>): void {
  if (!through) return
  const span = ys[ys.length - 1] - ys[0]
  let r = 0
  for (let j = 0; j < h; j++) {
    const y = ys[0] + (j * span) / Math.max(1, h - 1)
    while (r + 2 < ys.length && ys[r + 1] < y) r++
    const t = Math.min(1, Math.max(0, (y - ys[r]) / (ys[r + 1] - ys[r] || 1)))
    const left = through[r] + ((through[r + 1] ?? through[r]) - through[r]) * t
    for (let at = j * w * 4 + 3; at < (j + 1) * w * 4; at += 4) data[at] *= left
  }
}
