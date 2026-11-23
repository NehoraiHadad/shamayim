import type { LayerOf } from '../../../model/types'

/** A sheet's raster as the dusty air before it leaves it (`through`, per row of `ys`): it fades into the sky behind. In place. */
export function throughAir(data: Uint8ClampedArray, w: number, h: number, { ys, through }: Pick<LayerOf<'cloudSheet'>, 'ys' | 'through'>): void {
  if (!through) return
  const span = ys[ys.length - 1] - ys[0]
  let r = 0
  for (let j = 0; j < h; j++) {
    const y = ys[0] + (j * span) / Math.max(1, h - 1)
    while (r + 2 < ys.length && ys[r + 1] < y) r++
    const t = Math.min(1, Math.max(0, (y - ys[r]) / (ys[r + 1] - ys[r] || 1)))
    const left = through[r] + ((through[r + 1] ?? through[r]) - through[r]) * t
    const end = (j + 1) * w * 4
    for (let alpha = j * w * 4 + 3; alpha < end; alpha += 4) data[alpha] *= left
  }
}
