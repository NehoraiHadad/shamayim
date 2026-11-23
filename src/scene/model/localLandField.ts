import type { LivingLand } from '../../world/landLiving'
import type { RGB } from '../../world/types'
import { COVER_WATER, dominantWeightedSource, nonWaterLocalFallback } from './landPalette'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const axes = new WeakMap<LivingLand['local'], { xs: number[]; ys: number[] }>()

/** Bilinearly samples `world.land.local` at `(eastM, northM)`, excluding open water (`COVER_WATER = 8`). */
export function sampleLocalField(land: LivingLand, eastM: number, northM: number): { albedo: RGB; source: string } {
  const pts = land.local
  if (!pts.length) return nonWaterLocalFallback(land)
  let grid = axes.get(pts)
  if (!grid) {
    grid = {
      xs: [...new Set(pts.map((p) => p.eastM))].sort((a, b) => a - b),
      ys: [...new Set(pts.map((p) => p.northM))].sort((a, b) => a - b),
    }
    axes.set(pts, grid)
  }
  const { xs, ys } = grid
  const ex = clamp(eastM, xs[0], xs.at(-1)!), ny = clamp(northM, ys[0], ys.at(-1)!)
  const bracket = (arr: number[], v: number): [number, number, number] => {
    if (arr.length <= 1 || v <= arr[0]) return [0, 0, 0]
    if (v >= arr.at(-1)!) return [arr.length - 1, arr.length - 1, 0]
    let hi = 1
    while (hi < arr.length - 1 && arr[hi] < v) hi++
    return [hi - 1, hi, (v - arr[hi - 1]) / Math.max(1e-6, arr[hi] - arr[hi - 1])]
  }
  const [ix0, ix1, tx] = bracket(xs, ex), [iy0, iy1, ty] = bracket(ys, ny)
  const at = (e: number, n: number) => pts.find((p) => p.eastM === e && p.northM === n)
  const corners = [
    { pt: at(xs[ix0], ys[iy0]), w: (1 - tx) * (1 - ty) },
    { pt: at(xs[ix1], ys[iy0]), w: tx * (1 - ty) },
    { pt: at(xs[ix0], ys[iy1]), w: (1 - tx) * ty },
    { pt: at(xs[ix1], ys[iy1]), w: tx * ty },
  ]
  let r = 0, g = 0, b = 0, wSum = 0
  const contribs: { source: string; weight: number }[] = []
  for (const { pt, w } of corners) {
    if (!pt || w <= 0 || pt.sample.cover === COVER_WATER) continue
    r += pt.sample.albedo[0] * w; g += pt.sample.albedo[1] * w; b += pt.sample.albedo[2] * w
    wSum += w; contribs.push({ source: pt.sample.albedoSource, weight: w })
  }
  if (wSum > 0) return { albedo: [r / wSum, g / wSum, b / wSum], source: dominantWeightedSource(contribs) }
  let best = null as (typeof pts)[number] | null, bestD = Infinity
  for (const pt of pts) {
    if (pt.sample.cover === COVER_WATER) continue
    const d = Math.hypot(pt.eastM - eastM, pt.northM - northM)
    if (d < bestD) { bestD = d; best = pt }
  }
  return best ? { albedo: best.sample.albedo, source: best.sample.albedoSource } : nonWaterLocalFallback(land)
}
