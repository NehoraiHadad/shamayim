//# allFunctionsCalledOnLoad
import { ridgeLightSamples, smoothstep, type RidgeSample } from '../../world/ridgeLighting'
import { groundAt as lineAt } from '../../world/sceneLight'
import { shadowRuns } from '../../world/shadowRuns'
import type { Plane, RGB, WorldState } from '../../world/types'
import { localFootY, type PlaneName } from './faceProjection'
import { cloudShadowMultiplyRgb, FLAT_NORMAL, litLandRgb, surfaceNormal } from './landRadiance'
import { mixLight } from './tone'
import type { Face, Pt, Rim, SceneBox, Wash } from './types'

/**
 * Illustrated full-face washes, sunlit crest rims and linear-correct floor cast shadows (Stages C2 & 7).
 * Every tone comes from `landRadiance.ts` (no lightness cap, no hardcoded navy shade); wash depth spans
 * the plane's visible face (`footY - crestY`), not a narrow crest ribbon.
 */

/** Floor shadow: how deep below the ground surface it reads, and the narrowest run drawn (px). */
const FLOOR_DEPTH = 16
const MIN_RUN = 12

/** Runs of consecutive samples where `depth` is over a hair, as washes hanging from the crest. */
function washes(
  samples: RidgeSample[], full: readonly Pt[], depthOf: (s: RidgeSample, i: number) => number, sx: number,
  rgb: RGB, alpha: number,
): Wash[] {
  const out: Wash[] = []
  if (alpha <= 0.01) return out
  let top: Pt[] = [], depth: number[] = []
  const flush = () => {
    if (top.length >= 2 && Math.max(...depth) > 0.6) out.push({ top, depth, rgb, alpha })
    top = []; depth = []
  }
  let last = -1, lastDepth = 0
  for (const [i, s] of samples.entries()) {
    const d = depthOf(s, i)
    const index = Math.min(full.length - 1, i * 2)
    if (d > 0.15) {
      if (top.length && index - last === 2) {
        const [mx, my] = full[last + 1]
        top.push([mx * sx, my]); depth.push((d + lastDepth) / 2)
      }
      top.push([full[index][0] * sx, full[index][1]]); depth.push(d)
      last = index; lastDepth = d
    } else flush()
  }
  flush()
  return out
}

/** Caps each depth by its distance from the band's ends so bands taper cleanly to a point. */
function taper(samples: RidgeSample[], depth: number[]) {
  const pass = (order: number[]) => {
    let reach = 0
    for (let k = 0; k < order.length; k++) {
      const i = order[k]
      depth[i] = Math.min(depth[i], reach)
      const next = order[k + 1]
      reach = next === undefined ? 0 : depth[i] + 0.5 * Math.abs(samples[next].x - samples[i].x)
    }
  }
  const forward = samples.map((_, i) => i)
  pass(forward)
  pass(forward.reverse())
}

export interface CrestLight { shade: Wash[]; lit: Wash[]; rims: Rim[]; faces: Face[] }

/** Computes full-face lit/shaded washes, sunlit rims and linear-correct near-ridge floor shadows. */
export function crestLightOf(
  world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, sx: number, k: number,
  medianAlbedo: RGB, medHaze: number, haze: RGB, strength: number, fadeIn: number,
): CrestLight {
  const { light } = world
  if (!light.ray || fadeIn <= 0) return { shade: [], lit: [], rims: [], faces: [] }

  const crest = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
  const depths = crest.map(([x, y]) => Math.max(12, localFootY(world, name, x, y, box.landHeight) - y)).sort((a, b) => a - b)
  const faceDepth = depths[Math.floor(depths.length / 2)] ?? 32
  const samples = ridgeLightSamples(crest, { ray: light.ray, noonWeight: light.noonWeight, depth: faceDepth })
  const shows = samples.map((s) => name === 'near' || s.y < lineAt(world.terrain.near.points, s.x) - 0.5)

  // Representative lit and shade tones from the shared radiance model (no lightness cap).
  const litAcross = -Math.sign(light.dir.across || 1) * 0.25 * (1 - light.noonWeight)
  const litTone = litLandRgb(world, medianAlbedo, surfaceNormal(litAcross, 0.08), medHaze, haze, 1)
  const shadeTone = litLandRgb(world, medianAlbedo, FLAT_NORMAL, medHaze, haze, 0)

  // Soft painterly glaze (idempotent over `shadeField`'s exact per-cell normal lighting).
  const lit = washes(samples, plane.points, (s, i) => (shows[i] ? s.amount : 0), sx, litTone, 0.16 * fadeIn * k)
  const away = samples.map((s) =>
    faceDepth * Math.max(Math.max(0, -s.facing) * (1 - light.noonWeight) * 1.1, s.clearance < 0 ? 0.7 : 0))
  taper(samples, away)
  const shade = washes(samples, plane.points, (_, i) => (shows[i] ? away[i] : 0), sx, shadeTone, 0.16 * fadeIn * k)

  const rimTone = mixLight(litTone, [1, 1, 1], 0.18)
  const low = 1 - smoothstep(6, 15, light.altitude)
  const levels = [0.12, 0.2, 0.3, 0.4, 0.5]
  const runs: Pt[][][] = levels.map(() => [])
  let current: { level: number; pts: Pt[] } | null = null
  for (const [i, s] of samples.entries()) {
    if (!shows[i]) {
      if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
      current = null
      continue
    }
    const near = light.rimX !== null && Math.abs(s.x - light.rimX) < 70 ? low : 0
    const a = s.clearance > 0 ? Math.min(0.55, Math.max(0, s.facing) * 0.65 * strength * fadeIn * (1 + near)) * k : 0
    const level = a < 0.06 ? -1 : levels.findLastIndex((l) => a >= l * 0.8)
    if (current && current.level !== level) { if (current.pts.length >= 2) runs[current.level].push(current.pts); current = null }
    if (level >= 0) {
      current ??= { level: Math.max(0, level), pts: [] }
      current.pts.push([s.x * sx, s.y + 0.35])
    }
  }
  if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
  const rims = runs.flatMap((paths, i) => paths.map((points) => ({ points, rgb: rimTone, alpha: levels[i] })))

  // Floor cast shadows remove only the direct beam (painted in Band 0 `multiply`).
  const faces: Face[] = []
  if (name === 'near' && light.shares.sun > 0.002) {
    const shadowRgb = cloudShadowMultiplyRgb(world)
    for (const [a, b] of shadowRuns(crest, light.ray).filter(([a, b]) => b - a >= MIN_RUN)) {
      const xs = Array.from({ length: Math.round((b - a) / 3) + 1 }, (_, i) => a + i * 3)
      const top = xs.map((x): Pt => [x * sx, lineAt(plane.points, x) - 2])
      const bottom = [...xs].reverse().map((x): Pt => [x * sx, lineAt(plane.points, x) + FLOOR_DEPTH])
      faces.push({ points: [...top, ...bottom], rgb: shadowRgb, alpha: 0.75 * light.shares.sun * fadeIn, soft: 4 })
    }
  }
  return { shade, lit, rims, faces }
}
