//# allFunctionsCalledOnLoad
import type { LivingLand } from '../../world/landLiving'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { faceAtY, localFootY, type PlaneName } from './faceProjection'
import { COVER_WATER, nonWaterLocalFallback, quantiseTones, roundRgb, sampleBandAtKm } from './landPalette'
import { albedoToFormTone, linearLuminance, litLandRgb, srgbRgbToLinear } from './landRadiance'
import { labOf, rgbOfLab } from './tone'
import type { PlanePalette } from './types'

/**
 * Samples `WorldState.land` along each plane's ray columns and visible face profiles into compact, structured-cloneable
 * quantised reflectance-form palettes (`PlanePalette`, Stages 3 & 7). WorldCover open water (`COVER_WATER = 8`) is excluded.
 */
export { albedoToFormTone, quantiseTones } from './landPalette'
export type { PlaneName } from './faceProjection'

export interface PlaneSurfaceSpec { palette: PlanePalette; median: RGB; medianAlbedo: RGB }

const SPEC: Record<PlaneName, { cols: number; rows: number; maxColours: number }> = {
  near: { cols: 21, rows: 4, maxColours: 6 },
  far: { cols: 21, rows: 2, maxColours: 5 },
  back: { cols: 13, rows: 1, maxColours: 4 },
}

const medianByLum = (tones: readonly RGB[]) =>
  [...tones].sort((a, b) => linearLuminance(srgbRgbToLinear(a)) - linearLuminance(srgbRgbToLinear(b)))[Math.floor(tones.length / 2)]

const planeCache = new WeakMap<LivingLand, Map<string, PlaneSurfaceSpec>>()
const ownAlbedoCache = new WeakMap<LivingLand, RGB>()
const dominantSource = (counts: Map<string, number>, fallback: string) => {
  let out = fallback, best = -1
  for (const [s, n] of counts) if (n > best) { best = n; out = s }
  return out
}

/** Builds and caches the compact quantised reflectance-form `PlanePalette`, form median and raw BOA albedo median. */
export function planeSurfaceOf(world: WorldState, name: PlaneName, plane: Plane, landHeight = SCENE_H): PlaneSurfaceSpec {
  let byPlane = planeCache.get(world.land)
  if (!byPlane) planeCache.set(world.land, byPlane = new Map())
  const key = `${name}:${world.keys.terrain}:${landHeight}`
  const cached = byPlane.get(key)
  if (cached) return cached
  const { cols, rows, maxColours } = SPEC[name]
  const raw: { l: number; a: number; b: number }[] = [], rawAlbedos: RGB[] = [], visible: boolean[] = []
  const sources = new Map<string, number>(), nRays = Math.max(1, world.land.rays.length - 1)
  const xs = Array.from({ length: cols }, (_, c) => (cols > 1 ? c / (cols - 1) : 0.5) * SCENE_W)
  const crests = xs.map((x) => lineAt(plane.points, x))
  const feet = xs.map((x, c) => localFootY(world, name, x, crests[c], landHeight))
  for (let r = 0; r < rows; r++) {
    const rowFrac = rows > 1 ? r / (rows - 1) : 0
    for (let c = 0; c < cols; c++) {
      const frac = cols > 1 ? c / (cols - 1) : 0.5, x = xs[c]
      const shown = name !== 'far' || (world.terrain.sightAt ? world.terrain.sightAt(x).farShows : true)
      const targetY = crests[c] + rowFrac * Math.max(0, feet[c] - crests[c])
      const hit = sampleBandAtKm(world.land, frac * nRays, faceAtY(world, name, plane, x, crests[c], feet[c], targetY).km)
      if (shown) sources.set(hit.source, (sources.get(hit.source) ?? 0) + 1)
      visible.push(shown)
      rawAlbedos.push(hit.albedo)
      raw.push(labOf(albedoToFormTone(hit.albedo)))
    }
  }
  // Fill hidden far-plane cells from the nearest visible cell in the same row so hidden near ground never uses palette slots.
  if (name === 'far' && visible.some(Boolean)) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (visible[i]) continue
      for (let d = 1; d < cols; d++) {
        if (c - d >= 0 && visible[i - d]) { raw[i] = raw[i - d]; rawAlbedos[i] = rawAlbedos[i - d]; break }
        if (c + d < cols && visible[i + d]) { raw[i] = raw[i + d]; rawAlbedos[i] = rawAlbedos[i + d]; break }
      }
    }
  }
  const smoothed = raw.map((cur, idx) => {
    const c = idx % cols, l = c > 0 ? raw[idx - 1] : cur, r = c < cols - 1 ? raw[idx + 1] : cur
    return rgbOfLab({ l: 0.2 * l.l + 0.6 * cur.l + 0.2 * r.l, a: 0.2 * l.a + 0.6 * cur.a + 0.2 * r.a, b: 0.2 * l.b + 0.6 * cur.b + 0.2 * r.b })
  })
  const { palette, indices } = quantiseTones(smoothed, maxColours)
  const fallbackSrc = nonWaterLocalFallback(world.land).source
  const shownAlbedos = rawAlbedos.filter((_, i) => visible[i])
  const spec: PlaneSurfaceSpec = {
    palette: { palette, cols, rows, cells: indices, source: dominantSource(sources, fallbackSrc) },
    median: roundRgb(medianByLum(smoothed) ?? palette[0]),
    medianAlbedo: roundRgb(medianByLum(shownAlbedos.length ? shownAlbedos : rawAlbedos) ?? nonWaterLocalFallback(world.land).albedo),
  }
  if (byPlane.size > 12) byPlane.clear()
  byPlane.set(key, spec)
  return spec
}

/** Light-free BOA sRGB albedo of the place's own ground (median of non-water local samples, or non-water climatology). */
export function nearGroundAlbedo(world: WorldState): RGB {
  const cached = ownAlbedoCache.get(world.land)
  if (cached) return cached
  const pts = world.land.local.map((p) => p.sample).filter((s) => s.cover !== COVER_WATER)
  const albedos = pts.length ? pts.map((s) => s.albedo) : [nonWaterLocalFallback(world.land).albedo]
  const albedo = roundRgb(medianByLum(albedos))
  ownAlbedoCache.set(world.land, albedo)
  return albedo
}

/** Physically lit tone of the place's own ground (at zero distance, flat normal, shared `landRadiance` exposure). */
export function nearGroundTone(world: WorldState): RGB {
  return litLandRgb(world, nearGroundAlbedo(world))
}
