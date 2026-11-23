//# allFunctionsCalledOnLoad
import { ridgeLightSamples, smoothstep, type RidgeSample } from '../../world/ridgeLighting'
import { groundAt as lineAt } from '../../world/sceneLight'
import { shadowRuns } from '../../world/shadowRuns'
import type { Plane, RGB, WorldState } from '../../world/types'
import { darken, lightness, mixRgb } from './tone'
import type { Face, Pt, Rim, Wash } from './types'
import type { PlaneName } from './faceProjection'

/**
 * Crest-band lighting, shaded faces, crest rims and floor cast shadows for terrain planes (Stage C2).
 * Extracted from `planeLight.ts` to keep each model module focused and under 150 lines.
 */

/** Depth (px) of the lit and shaded bands below a crest. */
const DEPTH: Record<PlaneName, number> = { back: 7, far: 9, near: 16 }
/** Floor shadow: how deep below the ground surface it reads, and the narrowest run drawn (px). */
const FLOOR_DEPTH = 16
const MIN_RUN = 12
/** The colour of shade lit only by the sky (as the SVG's floor shadow, #1A2458). */
const SKY_SHADE: RGB = [0x1a / 255, 0x24 / 255, 0x58 / 255]

/** Mixes `from` toward `to` by `t`, but no lighter than `cap` (Oklab lightness), so a lit crest keeps clear of the sky. */
export function capped(from: RGB, to: RGB, t: number, cap: number): RGB {
  let mixed = mixRgb(from, to, t)
  if (lightness(mixed) <= cap) return mixed
  let lo = 0, hi = t
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    if (lightness(mixRgb(from, to, mid)) <= cap) lo = mid
    else hi = mid
  }
  mixed = mixRgb(from, to, lo)
  return mixed
}

/**
 * Runs of consecutive samples where `depth` is over a hair, as washes hanging from the crest. The samples are every
 * other crest point (`full`); each run takes the crest points between them too (depth halfway), so a wash's top is the
 * plane's own edge and it needs no clip.
 */
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

/** Caps each depth by its distance from the band's ends, so a band tapers to a point (as the SVG's lit bands do). */
function taper(samples: RidgeSample[], depth: number[]) {
  const pass = (order: number[]) => {
    let reach = 0
    for (let k = 0; k < order.length; k++) {
      const i = order[k]
      depth[i] = Math.min(depth[i], reach)
      const next = order[k + 1]
      reach = next === undefined ? 0 : depth[i] + 0.25 * Math.abs(samples[next].x - samples[i].x)
    }
  }
  const forward = samples.map((_, i) => i)
  pass(forward)
  pass(forward.reverse())
}

export interface CrestLight { shade: Wash[]; lit: Wash[]; rims: Rim[]; faces: Face[] }

/** Computes crest lit/shaded washes, sunlit rims and near-ridge floor shadows when direct light is present. */
export function crestLightOf(
  world: WorldState, name: PlaneName, plane: Plane, sx: number, k: number,
  tint: RGB, sky: RGB, lightTint: RGB, cap: number, strength: number, fadeIn: number,
): CrestLight {
  const { light } = world
  if (!light.ray || fadeIn <= 0) return { shade: [], lit: [], rims: [], faces: [] }

  const depth = DEPTH[name]
  const crest = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
  const samples = ridgeLightSamples(crest, { ray: light.ray, noonWeight: light.noonWeight, depth })
  const litTone = capped(tint, lightTint, 0.6, cap)
  const shows = samples.map((s) => name === 'near' || s.y < lineAt(world.terrain.near.points, s.x) - 0.5)
  const lit = washes(samples, plane.points, (s, i) => (shows[i] ? s.amount : 0), sx, litTone, Math.min(0.9, 0.2 + 0.75 * strength) * fadeIn * k)
  const away = samples.map((s) => depth * Math.max(Math.max(0, -s.facing) * (1 - light.noonWeight) * 1.2, s.clearance < 0 ? 0.7 : 0))
  taper(samples, away)
  const shadeTone = mixRgb(darken(tint, 0.7), SKY_SHADE, 0.2)
  const shade = washes(samples, plane.points, (_, i) => (shows[i] ? away[i] : 0), sx, shadeTone, 0.6 * strength * fadeIn * k)

  const rimTone = capped(tint, mixRgb(lightTint, [1, 1, 1], 0.2), 0.9, lightness(sky) - 0.03)
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
    const a = s.clearance > 0 ? Math.min(0.6, Math.max(0, s.facing) * 0.7 * strength * fadeIn * (1 + near)) * k : 0
    const level = a < 0.06 ? -1 : levels.findLastIndex((l) => a >= l * 0.8)
    if (current && current.level !== level) { if (current.pts.length >= 2) runs[current.level].push(current.pts); current = null }
    if (level >= 0) {
      current ??= { level: Math.max(0, level), pts: [] }
      current.pts.push([s.x * sx, s.y + 0.35])
    }
  }
  if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
  const rims = runs.flatMap((paths, i) => paths.map((points) => ({ points, rgb: rimTone, alpha: levels[i] })))

  const faces: Face[] = []
  if (name === 'near' && light.shares.sun > 0.002) {
    for (const [a, b] of shadowRuns(crest, light.ray).filter(([a, b]) => b - a >= MIN_RUN)) {
      const xs = Array.from({ length: Math.round((b - a) / 3) + 1 }, (_, i) => a + i * 3)
      const top = xs.map((x): Pt => [x * sx, lineAt(plane.points, x) - 2])
      const bottom = [...xs].reverse().map((x): Pt => [x * sx, lineAt(plane.points, x) + FLOOR_DEPTH])
      faces.push({ points: [...top, ...bottom], rgb: SKY_SHADE, alpha: 0.3 * light.shares.sun * fadeIn, soft: 4 })
    }
  }
  return { shade, lit, rims, faces }
}
