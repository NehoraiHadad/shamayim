//# allFunctionsCalledOnLoad
import type { LivingLand } from '../../world/landLiving'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { faceAtY, localFootY, PALETTE_COLS, type PlaneName } from './faceProjection'
import { COVER_WATER, nonWaterLocalFallback, quantiseTones, roundRgb, sampleBandAtKm } from './landPalette'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { planeGeomOf } from './planeGeometry'
import { labOf, rgbOfLab } from './tone'
import type { PlanePalette } from './types'

/**
 * Samples `WorldState.land` along each plane's ray columns and visible face profiles into compact, structured-cloneable
 * raw BOA sRGB albedo palettes (`PlanePalette`, Stages 3 & 7 round 2). WorldCover open water (`COVER_WATER = 8`) is excluded.
 */
export { quantiseTones } from './landPalette'
export type { PlaneName } from './faceProjection'

export interface PlaneSurfaceSpec { palette: PlanePalette; median: RGB }

const SPEC: Record<PlaneName, { rows: number; maxColours: number }> = {
  near: { rows: 4, maxColours: 14 },
  far: { rows: 2, maxColours: 5 },
  back: { rows: 1, maxColours: 4 },
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

/** Builds and caches the compact quantised raw BOA sRGB `PlanePalette` and median BOA albedo for one plane. */
export function planeSurfaceOf(world: WorldState, name: PlaneName, plane: Plane, landHeight = SCENE_H): PlaneSurfaceSpec {
  let byPlane = planeCache.get(world.land)
  if (!byPlane) planeCache.set(world.land, byPlane = new Map())
  const geom = planeGeomOf(world, name, plane, landHeight)
  const key = `${name}:${geom.geomKey}:${landHeight}`
  const cached = byPlane.get(key)
  if (cached) return cached
  const { rows, maxColours } = SPEC[name], cols = PALETTE_COLS[name]
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
      raw.push(labOf(hit.albedo))
    }
  }
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
    return rgbOfLab({ l: 0.08 * l.l + 0.84 * cur.l + 0.08 * r.l,
      a: 0.12 * l.a + 0.76 * cur.a + 0.12 * r.a, b: 0.12 * l.b + 0.76 * cur.b + 0.12 * r.b })
  })
  const { palette, indices } = quantiseTones(smoothed, maxColours)
  const fallbackSrc = nonWaterLocalFallback(world.land).source
  const shownAlbedos = rawAlbedos.filter((_, i) => visible[i])
  const med = roundRgb(medianByLum(shownAlbedos.length ? shownAlbedos : rawAlbedos) ?? nonWaterLocalFallback(world.land).albedo)
  const spec: PlaneSurfaceSpec = {
    palette: { palette, cols, rows, cells: indices, source: dominantSource(sources, fallbackSrc) },
    median: med,
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
