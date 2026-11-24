//# allFunctionsCalledOnLoad
import type { LivingLand } from '../../world/landLiving'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { faceAtY, localFootY, PALETTE_COLS, type PlaneName } from './faceProjection'
import { COVER_WATER, dryPartsAtKm, nonWaterLocalFallback, quantiseTones, roundRgb, sampleBandAtKm } from './landPalette'
import { linearLuminance, linearRgbToSrgb, srgbRgbToLinear } from './landRadiance'
import { planeGeomOf } from './planeGeometry'
import { labOf, rgbOfLab } from './tone'
import type { PlanePalette } from './types'

/**
 * Samples `WorldState.land` along each plane's ray columns and visible face profiles into compact, structured-cloneable
 * raw BOA sRGB albedo palettes (`PlanePalette`, Stages 3 & 7 round 2). WorldCover open water (`COVER_WATER = 8`) is excluded.
 */
export { quantiseTones } from './landPalette'
export type { PlaneName } from './faceProjection'

export interface PlaneSurfaceSpec {
  palette: PlanePalette
  /** The dry ground's mean reflectance (linear) over the part of the picture the face shows; main's median where it shows none. */
  mean: RGB
}

const SPEC: Record<PlaneName, { rows: number; maxColours: number }> = {
  near: { rows: 4, maxColours: 14 },
  far: { rows: 2, maxColours: 5 },
  back: { rows: 1, maxColours: 4 },
}

const medianByLum = (tones: readonly RGB[]) =>
  [...tones].sort((a, b) => linearLuminance(srgbRgbToLinear(a)) - linearLuminance(srgbRgbToLinear(b)))[Math.floor(tones.length / 2)]

interface Weighted { albedo: RGB; weight: number }
const isNumber = (albedo: RGB) => albedo.every(Number.isFinite)

/** Null where nothing has any weight. */
function meanAlbedo(parts: readonly Weighted[]): RGB | null {
  const sum: [number, number, number] = [0, 0, 0]
  let total = 0
  for (const { albedo, weight } of parts) {
    const rho = srgbRgbToLinear(albedo)
    total += weight
    for (let k = 0; k < 3; k++) sum[k] += rho[k] * weight
  }
  return total > 0 ? linearRgbToSrgb([sum[0] / total, sum[1] / total, sum[2] / total]) : null
}

/** A node's part of its row or column, by the trapezoid rule: the painter interpolates between nodes, so an end one has half. */
const nodePart = (i: number, count: number) => (count > 1 && (i === 0 || i === count - 1) ? 0.5 : 1)

/** The depth (px) of each column of a face that no nearer land covers. */
function shownDepths({ terrain }: WorldState, name: PlaneName, xs: number[], crests: number[], feet: number[]): number[] {
  const nearer = [name !== 'near' && terrain.near, name === 'back' && terrain.far].filter((p) => p && p.points.length > 1) as Plane[]
  return xs.map((x, c) => Math.max(0, Math.min(feet[c], ...nearer.map((p) => lineAt(p.points, x))) - crests[c]))
}

const planeCache = new WeakMap<LivingLand, Map<string, PlaneSurfaceSpec>>()
const ownAlbedoCache = new WeakMap<LivingLand, RGB>()
const dominantSource = (counts: Map<string, number>, fallback: string) => {
  let out = fallback, best = -1
  for (const [s, n] of counts) if (n > best) { best = n; out = s }
  return out
}

/** Builds and caches the compact quantised raw BOA sRGB `PlanePalette` and area mean BOA albedo for one plane. */
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
  const depths = shownDepths(world, name, xs, crests, feet), dry: Weighted[] = []
  for (let r = 0; r < rows; r++) {
    const rowFrac = rows > 1 ? r / (rows - 1) : 0
    for (let c = 0; c < cols; c++) {
      const frac = cols > 1 ? c / (cols - 1) : 0.5, x = xs[c]
      const shown = name !== 'far' || (world.terrain.sightAt ? world.terrain.sightAt(x).farShows : true)
      const targetY = crests[c] + rowFrac * Math.max(0, feet[c] - crests[c])
      const { km } = faceAtY(world, name, plane, x, crests[c], feet[c], targetY)
      const hit = sampleBandAtKm(world.land, frac * nRays, km)
      if (shown) sources.set(hit.source, (sources.get(hit.source) ?? 0) + 1)
      if (shown && depths[c] > 0) {
        // The mean's rows divide what is seen: the palette's last lies under the nearer crest, so that the two meet there.
        const seen = faceAtY(world, name, plane, x, crests[c], feet[c], crests[c] + rowFrac * depths[c])
        const area = depths[c] * nodePart(c, cols) * nodePart(r, rows)
        for (const { albedo, share } of dryPartsAtKm(world.land, frac * nRays, seen.km)) dry.push({ albedo, weight: area * share })
      }
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
  const median = () => medianByLum((shownAlbedos.length ? shownAlbedos : rawAlbedos).filter(isNumber))
  const mean = roundRgb(meanAlbedo(dry.filter((p) => isNumber(p.albedo))) ?? median() ?? nonWaterLocalFallback(world.land).albedo)
  const spec: PlaneSurfaceSpec = {
    palette: { palette, cols, rows, cells: indices, source: dominantSource(sources, fallbackSrc) },
    mean,
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
