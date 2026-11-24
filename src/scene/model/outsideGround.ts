//# allFunctionsCalledOnLoad
import type { OutsideFrame } from '../../data/city/outsideView'
import type { LandLocalPoint, LivingLand } from '../../world/landLiving'
import type { OutsideView, RGB, WorldState } from '../../world/types'
import { nonWaterLocalFallback, quantiseTones } from './landPalette'
import { linearLuminance, litLandRgb, srgbRgbToLinear, surfaceNormal } from './landRadiance'
import { snowyAlbedo } from './landSnow'
import { smoothstep } from '../../world/ridgeLighting'
import { hazeAt, hazeOf } from './landVeil'
import { skyAt } from './sky'
import { COVER_WATER, dominantWeightedSource, ownGroundTone, type GroundTone } from './nearTone'
import { mixLight, mixRgb } from './tone'
import type { OutsideLandDesc, Pt, SceneBox } from './types'

/**
 * Outside-view own-ground albedo stops and descriptor (Stage C5b + Living Land Stages 3 & 7).
 * Resolves raw local BOA albedos strictly from `world.land.local` (`view.land.localKm`) and lights every stop
 * through the shared `litLandRgb` physical radiance model so outside ground agrees with the near ridge behind it.
 */

export interface OutsideGroundSpec { stops: [number, RGB][]; median: RGB; source: string }

/** Gently viewer-facing ridge normal matching the near hillside behind the outside-view portrait. */
const OUTSIDE_NORMAL = surfaceNormal(0, 0.08)

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const medianByLum = (tones: readonly RGB[]) =>
  [...tones].sort((a, b) => linearLuminance(srgbRgbToLinear(a)) - linearLuminance(srgbRgbToLinear(b)))[Math.floor(tones.length / 2)]

/** A point of the local grid: the place's own ground at the centre, the point's cell elsewhere; null on open water. */
function groundAt(land: LivingLand, { eastM, northM, sample }: LandLocalPoint): GroundTone | null {
  const own = eastM === 0 && northM === 0 ? ownGroundTone(land) : null
  return own ?? (sample.cover === COVER_WATER ? null : { albedo: sample.albedo, source: sample.albedoSource })
}

/** Bilinearly samples `world.land.local` at `(eastM, northM)`, excluding open water (`COVER_WATER = 8`). */
export function sampleLocalField(land: LivingLand, eastM: number, northM: number): { albedo: RGB; source: string } {
  const pts = land.local
  if (!pts.length) return nonWaterLocalFallback(land)
  const xs = [...new Set(pts.map((p) => p.eastM))].sort((a, b) => a - b)
  const ys = [...new Set(pts.map((p) => p.northM))].sort((a, b) => a - b)
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
    const tone = pt && w > 0 ? groundAt(land, pt) : null
    if (!tone) continue
    r += tone.albedo[0] * w; g += tone.albedo[1] * w; b += tone.albedo[2] * w
    wSum += w; contribs.push({ source: tone.source, weight: w })
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

const outsideCache = new WeakMap<LivingLand, Map<string, OutsideGroundSpec>>()

/** Quantised light-free BOA albedo stops across the place's own ground polygon from `world.land.local`, memoised per `world.land`. */
export function outsideGroundStops(world: WorldState, land: NonNullable<OutsideView['land']>, frame: OutsideFrame): OutsideGroundSpec {
  let byKey = outsideCache.get(world.land)
  if (!byKey) outsideCache.set(world.land, byKey = new Map())
  const loc = land.localKm
  const key = `${world.keys.place}:${land.top.length}:${loc?.[0]?.[0].toFixed(2) ?? frame.e.toFixed(2)}:${loc?.at(-1)?.[0].toFixed(2) ?? frame.w.toFixed(2)}`
  const cached = byKey.get(key)
  if (cached) return cached
  const count = 7, samples: RGB[] = [], contribs: { source: string; weight: number }[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    let dxKm: number, dyKm: number
    if (loc && loc.length >= 2) {
      const pos = t * (loc.length - 1), lo = Math.floor(pos), hi = Math.min(loc.length - 1, lo + 1), f = pos - lo
      dxKm = loc[lo][0] + (loc[hi][0] - loc[lo][0]) * f
      dyKm = loc[lo][1] + (loc[hi][1] - loc[lo][1]) * f
    } else {
      // Portrait-frame east (left) -> west (right) fallback if synthetic `OutsideView` omits `localKm`.
      dxKm = frame.e + (frame.w - frame.e) * t
      dyKm = (frame.n + frame.s) / 2
    }
    const hit = sampleLocalField(world.land, dxKm * 1000, dyKm * 1000)
    contribs.push({ source: hit.source, weight: 1 })
    samples.push(hit.albedo)
  }
  const { palette, indices } = quantiseTones(samples, 4)
  const stops: [number, RGB][] = indices.map((ci, i) => [i / (count - 1), palette[ci]])
  const spec: OutsideGroundSpec = { stops, median: medianByLum(stops.map(([, c]) => c)), source: dominantWeightedSource(contribs) }
  if (byKey.size > 8) byKey.clear()
  byKey.set(key, spec)
  return spec
}

function coveredStops(world: WorldState, land: NonNullable<OutsideView['land']>, stops: [number, RGB][]): [number, RGB][] {
  const { snow } = world, height = land.heightM
  if (!snow || !height || height.length < 2) return stops
  const [left, right] = [land.top[0][0], land.top.at(-1)![0]]
  if (right <= left) return stops
  return land.top.map(([x], i) => {
    const t = clamp((x - left) / (right - left), 0, 1)
    const p = t * (stops.length - 1), lo = Math.floor(p), hi = Math.min(stops.length - 1, lo + 1)
    const cover = (0.55 + 0.4 * (snow.amount ?? 0)) * smoothstep(snow.lineM - 15, snow.lineM + 15, height[i])
    return [t, snowyAlbedo(mixLight(stops[lo][1], stops[hi][1], p - lo), cover)]
  })
}

/** The representative surface seen by architectural ground bounce, including snow cover. */
export function outsideGroundAlbedo(world: WorldState, land: NonNullable<OutsideView['land']>, frame: OutsideFrame): RGB {
  const { stops, median } = outsideGroundStops(world, land, frame)
  return world.snow ? medianByLum(coveredStops(world, land, stops).map(([, color]) => color)) : median
}

/** Builds the complete outside-ground descriptor with local albedos lit and hazed through the shared radiance model. */
export function outsideLandDesc(world: WorldState, view: OutsideView, box: SceneBox, sx: number): OutsideLandDesc | null {
  if (!view.land) return null
  const raw = outsideGroundStops(world, view.land, view.frame)
  const haze = hazeOf(world)
  const share = hazeAt(world, view.land.km)
  const covered = coveredStops(world, view.land, raw.stops)
  const stops: [number, RGB][] = covered.map(([t, c]) => [t, litLandRgb(world, c, OUTSIDE_NORMAL, share, haze, 1, covered === raw.stops ? undefined : 1)])
  const tone = medianByLum(stops.map(([, c]) => c))
  return {
    top: view.land.top.map(([x, y]): Pt => [x * sx, y]),
    base: view.land.base.map(([x, y]): Pt => [x * sx, y]),
    tone, stops, source: raw.source,
    rim: mixRgb(tone, skyAt(world, box)(2), 0.35),
  }
}
