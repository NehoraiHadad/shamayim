//# allFunctionsCalledOnLoad
import { sampleLocalField } from './localLandField'
import type { OutsideFrame } from '../../data/city/outsideView'
import type { LivingLand } from '../../world/landLiving'
import type { OutsideView, RGB, WorldState } from '../../world/types'
import { dominantWeightedSource, quantiseTones } from './landPalette'
import { linearLuminance, litLandRgb, srgbRgbToLinear, surfaceNormal } from './landRadiance'
import { snowyAlbedo } from './landSnow'
import { smoothstep } from '../../world/ridgeLighting'
import { hazeAt, hazeOf } from './landVeil'
import { skyAt } from './sky'
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
