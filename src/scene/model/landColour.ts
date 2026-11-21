//# allFunctionsCalledOnLoad
import type { LivingLand } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, RGB, WorldState } from '../../world/types'
import { albedoToLandTone, quantiseTones, roundRgb } from './landPalette'
import { labOf, rgbOfLab } from './tone'
import type { PlanePalette } from './types'

/**
 * Samples `WorldState.land` along each plane's ray columns and visible face distances into compact,
 * structured-cloneable quantised palettes (`PlanePalette`) and outside-ground stops (Stage 3).
 * WorldCover open water (`COVER_WATER = 8`) is excluded from land planes (water is painted by `water.ts`).
 */
export { albedoToLandTone, quantiseTones } from './landPalette'

const COVER_WATER = 8
export type PlaneName = 'back' | 'far' | 'near'
export interface PlaneSurfaceSpec { palette: PlanePalette; median: RGB }

const SPEC: Record<PlaneName, { cols: number; rows: number; maxColours: number }> = {
  near: { cols: 21, rows: 4, maxColours: 6 },
  far: { cols: 21, rows: 2, maxColours: 5 },
  back: { cols: 13, rows: 1, maxColours: 4 },
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

function sampleBandAtKm(land: LivingLand, rayIdx: number, km: number): { albedo: RGB; source: string } {
  const rays = land.rays
  if (!rays.length) return { albedo: land.own.albedo, source: land.own.albedoSource }
  const idx = clamp(Math.round(rayIdx), 0, rays.length - 1)
  let bands = rays[idx].bands.filter((b) => b.sample.cover !== COVER_WATER)
  for (let d = 1; d < rays.length && !bands.length; d++) {
    for (const j of [idx - d, idx + d]) {
      if (j >= 0 && j < rays.length) {
        const cand = rays[j].bands.filter((b) => b.sample.cover !== COVER_WATER)
        if (cand.length) { bands = cand; break }
      }
    }
  }
  if (!bands.length) return { albedo: land.own.albedo, source: land.own.albedoSource }
  const distM = Math.max(50, km * 1000)
  const hi = bands.findIndex((b) => b.distanceM >= distM)
  let albedo: RGB, source: string
  if (hi <= 0) { albedo = bands[0].sample.albedo; source = bands[0].sample.albedoSource }
  else if (hi === -1) { albedo = bands.at(-1)!.sample.albedo; source = bands.at(-1)!.sample.albedoSource }
  else {
    const a = bands[hi - 1], b = bands[hi]
    const t = clamp((Math.log(distM) - Math.log(a.distanceM)) / Math.max(1e-6, Math.log(b.distanceM) - Math.log(a.distanceM)), 0, 1)
    albedo = lerpRgb(a.sample.albedo, b.sample.albedo, t)
    source = t < 0.5 ? a.sample.albedoSource : b.sample.albedoSource
  }
  if (distM < 700 && land.own.cover !== COVER_WATER) albedo = lerpRgb(albedo, land.own.albedo, clamp((700 - distM) / 500, 0, 0.55))
  return { albedo, source }
}

function crestKmAt(plane: Plane, x: number): number {
  const pts = plane.points, kms = plane.distanceKm
  if (!pts.length || !kms.length) return 2
  if (x <= pts[0][0]) return kms[0]
  if (x >= pts.at(-1)![0]) return kms.at(-1)!
  let lo = 0, hi = pts.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] >= x) hi = mid; else lo = mid + 1 }
  return kms[lo - 1] + (kms[lo] - kms[lo - 1]) * ((x - pts[lo - 1][0]) / Math.max(1e-6, pts[lo][0] - pts[lo - 1][0]))
}

function faceKmAt(world: WorldState, name: PlaneName, plane: Plane, x: number, rowFrac: number): number {
  const crestKm = crestKmAt(plane, x)
  if (name === 'back') return crestKm
  const cols = world.terrain.faces[name]?.columns
  if (cols?.length) {
    const step = Math.max(1e-6, (cols.at(-1)!.x - cols[0].x) / Math.max(1, cols.length - 1))
    const pts = cols[clamp(Math.round((x - cols[0].x) / step), 0, cols.length - 1)].points
    if (pts.length >= 2) return pts[clamp(Math.round(rowFrac * (pts.length - 1)), 0, pts.length - 1)].km
  }
  return name === 'near' ? Math.max(0.35, crestKm * (1 - 0.65 * rowFrac)) : crestKm * (1 - 0.25 * rowFrac)
}

const planeCache = new WeakMap<LivingLand, Map<string, PlaneSurfaceSpec>>()
const ownCache = new WeakMap<LivingLand, RGB>()
const dominantSource = (counts: Map<string, number>, fallback: string) => {
  let out = fallback, best = -1
  for (const [s, n] of counts) if (n > best) { best = n; out = s }
  return out
}

/** Builds and caches the compact quantised `PlanePalette` and median tone for one land plane. */
export function planeSurfaceOf(world: WorldState, name: PlaneName, plane: Plane): PlaneSurfaceSpec {
  let byPlane = planeCache.get(world.land)
  if (!byPlane) planeCache.set(world.land, byPlane = new Map())
  const cached = byPlane.get(name)
  if (cached) return cached
  const { cols, rows, maxColours } = SPEC[name]
  const raw: { l: number; a: number; b: number }[] = [], visible: boolean[] = []
  const sources = new Map<string, number>(), nRays = Math.max(1, world.land.rays.length - 1)
  for (let r = 0; r < rows; r++) {
    const rowFrac = rows > 1 ? r / (rows - 1) : 0
    for (let c = 0; c < cols; c++) {
      const frac = cols > 1 ? c / (cols - 1) : 0.5, x = frac * SCENE_W
      const shown = name !== 'far' || (world.terrain.sightAt ? world.terrain.sightAt(x).farShows : true)
      const hit = sampleBandAtKm(world.land, frac * nRays, faceKmAt(world, name, plane, x, rowFrac))
      if (shown) sources.set(hit.source, (sources.get(hit.source) ?? 0) + 1)
      visible.push(shown)
      raw.push(labOf(albedoToLandTone(hit.albedo)))
    }
  }
  // Replace hidden far-plane cells with the nearest visible cell in the same row so hidden near ground never
  // bleeds across the seam or consumes quantised palette slots.
  if (name === 'far' && visible.some(Boolean)) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        if (visible[i]) continue
        for (let d = 1; d < cols; d++) {
          if (c - d >= 0 && visible[i - d]) { raw[i] = raw[i - d]; break }
          if (c + d < cols && visible[i + d]) { raw[i] = raw[i + d]; break }
        }
      }
    }
  }
  const smoothed: RGB[] = raw.map((cur, idx) => {
    const c = idx % cols, l = c > 0 ? raw[idx - 1] : cur, r = c < cols - 1 ? raw[idx + 1] : cur
    return rgbOfLab({ l: 0.2 * l.l + 0.6 * cur.l + 0.2 * r.l, a: 0.2 * l.a + 0.6 * cur.a + 0.2 * r.a, b: 0.2 * l.b + 0.6 * cur.b + 0.2 * r.b })
  })
  const { palette, indices } = quantiseTones(smoothed, maxColours)
  const median = roundRgb([...smoothed].sort((a, b) => labOf(a).l - labOf(b).l)[Math.floor(smoothed.length / 2)] ?? palette[0])
  const spec: PlaneSurfaceSpec = { palette: { palette, cols, rows, cells: indices, source: dominantSource(sources, world.land.own.albedoSource) }, median }
  byPlane.set(name, spec)
  return spec
}

/** Light-free living-land tone of the place's own ground (median of non-water local samples). */
export function nearGroundTone(world: WorldState): RGB {
  const cached = ownCache.get(world.land)
  if (cached) return cached
  const pts = world.land.local.map((p) => p.sample).filter((s) => s.cover !== COVER_WATER)
  const tones = (pts.length ? pts : [world.land.own]).map((s) => albedoToLandTone(s.albedo)).sort((a, b) => labOf(a).l - labOf(b).l)
  const tone = tones[Math.floor(tones.length / 2)]
  ownCache.set(world.land, tone)
  return tone
}

/** Quantised light-free stops across the place's own ground polygon (`outside.ts`). */
export function outsideGroundStops(world: WorldState, x0: number, x1: number, km: number): { stops: [number, RGB][]; median: RGB; source: string } {
  const count = 7, nRays = Math.max(1, world.land.rays.length - 1), samples: RGB[] = [], sources = new Map<string, number>()
  for (let i = 0; i < count; i++) {
    const hit = sampleBandAtKm(world.land, clamp((x0 + (x1 - x0) * (i / (count - 1))) / SCENE_W, 0, 1) * nRays, km)
    sources.set(hit.source, (sources.get(hit.source) ?? 0) + 1)
    samples.push(albedoToLandTone(hit.albedo))
  }
  const { palette, indices } = quantiseTones(samples, 4)
  const stops: [number, RGB][] = indices.map((ci, i) => [i / (count - 1), palette[ci]])
  const median = [...stops.map(([, c]) => c)].sort((a, b) => labOf(a).l - labOf(b).l)[Math.floor(count / 2)]
  return { stops, median, source: dominantSource(sources, world.land.own.albedoSource) }
}
