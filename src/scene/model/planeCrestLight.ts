//# allFunctionsCalledOnLoad
import { lateral } from '../../domain/camera'
import { ridgeLightRay, smoothstep } from '../../world/ridgeLighting'
import { clearanceOf, groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { type PlaneName } from './faceProjection'
import { dirAtBearing, litLandRgb, surfaceNormal, type LandIrradiance } from './landRadiance'
import type { PlaneGeomGrid } from './planeGeometry'
import { mixLight } from './tone'
import type { Pt, Rim, SceneBox, Wash } from './types'

/**
 * Illustrated crest washes and sunlit crest rims (Stages C2 & 7 round 2, Finding 2).
 * Uses the EXACT SAME per-column 3D DEM normals `(nx, ny, nz)`, per-column bearing light vector `dirAtBearing`,
 * and terrain clearance visibility as `PlaneLitField` — never a separate `EXAGGERATION = 3` 2D facing.
 * Tones are single-hazed once at crest distance (never passed through a second veil).
 */

interface CrestSample { x: number; y: number; clearance: number; ndotl: number; facingSide: number; amount: number }

function washes(
  samples: CrestSample[], full: readonly Pt[], depthOf: (s: CrestSample, i: number) => number, sx: number,
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

function taper(samples: CrestSample[], depth: number[], maxDepth: number) {
  const slope = Math.max(0.25, maxDepth / 64)
  const pass = (order: number[]) => {
    let reach = 0
    for (let k = 0; k < order.length; k++) {
      const i = order[k]
      depth[i] = Math.min(depth[i], reach)
      const next = order[k + 1]
      reach = next === undefined ? 0 : depth[i] + slope * Math.abs(samples[next].x - samples[i].x)
    }
  }
  const forward = samples.map((_, i) => i)
  pass(forward)
  pass(forward.reverse())
}

export interface CrestLight { shade: Wash[]; lit: Wash[]; rims: Rim[] }

/** Computes single-hazed crest washes and sunlit rims from the shared 3D DEM normals & per-column bearing frame. */
export function crestLightOf(
  world: WorldState, _box: SceneBox, name: PlaneName, plane: Plane, geom: PlaneGeomGrid, irr: LandIrradiance,
  sx: number, k: number, medianAlbedo: RGB, medHaze: number, haze: RGB, strength: number, fadeIn: number,
): CrestLight {
  const { light } = world
  if (!light.ray || fadeIn <= 0) return { shade: [], lit: [], rims: [] }

  const crest = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
  const depths = Array.from(geom.crestY, (cy, c) => Math.max(10, geom.footY[c] - cy)).sort((a, b) => a - b)
  const faceDepth = Math.min(44, Math.max(14, (depths[Math.floor(depths.length / 2)] ?? 28) * 0.72))
  const byMoon = light.shares.moon > light.shares.sun
  const bodyAz = byMoon ? irr.moonAz : irr.sunAz, bodyAlt = byMoon ? irr.moonAlt : irr.sunAlt
  const handed = world.camera.handed

  const samples: CrestSample[] = crest.map(([x, y], i) => {
    const colF = Math.max(0, Math.min(geom.cols - 1, (x / 375) * (geom.cols - 1)))
    const c = Math.round(colF)
    const bearing = geom.bearing[c]
    const sDir = dirAtBearing(bodyAz, bodyAlt, bearing, handed)
    const lat = lateral(bodyAz, { ...world.camera, heading: bearing })
    const ray = ridgeLightRay(lat, Math.max(0.5, bodyAlt))
    const len = Math.hypot(ray[0], ray[1]) || 1
    const clearance = clearanceOf(crest, x, y, [ray[0] / len, ray[1] / len])
    const vis = smoothstep(0, 1, clearance)
    // Shared 3D DEM normal at the crest (`row = 0`), plus local crest tangent sign for crisp flank contrast.
    const ux = geom.nx[c], uy = geom.ny[c], uz = geom.nz[c]
    const ndotl = Math.max(0, ux * sDir.across + uy * sDir.ahead + uz * sDir.up)
    const prev = crest[i - 1] ?? crest[i], next = crest[i + 1] ?? crest[i]
    const drawnSlope = (prev[1] - next[1]) / (next[0] - prev[0] || 1)
    const facingSide = (-drawnSlope * lat) / Math.hypot(1, drawnSlope)
    // Directional highlight weight: strongly favours sun-facing flanks, stays alive on sunlit ridges at noon.
    const highlight = Math.max(0, ndotl * 0.55 + Math.max(0, facingSide) * 0.65 - Math.max(0, -facingSide) * 0.55)
    return { x, y, clearance, ndotl, facingSide, amount: faceDepth * Math.min(1, highlight) * vis }
  })
  const litDepths = samples.map((s) => s.amount)
  taper(samples, litDepths, faceDepth)
  samples.forEach((s, i) => { s.amount = litDepths[i] })

  const shows = samples.map((s) => name === 'near' || s.y < lineAt(world.terrain.near.points, s.x) - 0.5)
  const litAcross = -Math.sign(light.dir.across || 1) * 0.45
  const litBase = litLandRgb(world, medianAlbedo, surfaceNormal(litAcross, -0.08), medHaze, haze, 1)
  const litTone = mixLight(litBase, [1, 1, 1], 0.14 * smoothstep(0, 0.4, light.shares.sun))
  const shadeTone = litLandRgb(world, medianAlbedo, surfaceNormal(-litAcross, 0.35), medHaze, haze, 0)

  const lit = washes(samples, plane.points, (s, i) => (shows[i] ? s.amount : 0), sx, litTone, 0.38 * fadeIn * k)
  const away = samples.map((s) => faceDepth * Math.max(Math.max(0, -s.facingSide) * 1.05, s.clearance < 0 ? 0.75 : 0))
  taper(samples, away, faceDepth)
  const shade = washes(samples, plane.points, (_, i) => (shows[i] ? away[i] : 0), sx, shadeTone, 0.34 * fadeIn * k)

  // Sunlit crest rim from the same 3D `ndotl` & clearance: warm soft catchlight at noon, strong at low sun.
  const rimTone = mixLight(litBase, [1, 1, 1], 0.24)
  const low = 1 - smoothstep(6, 18, light.altitude)
  const levels = [0.12, 0.22, 0.34, 0.46, 0.58]
  const runs: Pt[][][] = levels.map(() => [])
  let current: { level: number; pts: Pt[] } | null = null
  for (const [i, s] of samples.entries()) {
    if (!shows[i]) {
      if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
      current = null
      continue
    }
    const near = light.rimX !== null && Math.abs(s.x - light.rimX) < 70 ? low : 0
    const rimW = Math.max(0, s.ndotl * 0.55 + Math.max(0, s.facingSide) * 0.55)
    const a = s.clearance > 0 ? Math.min(0.62, rimW * 0.78 * strength * fadeIn * (1 + near)) * k : 0
    const level = a < 0.08 ? -1 : levels.findLastIndex((l) => a >= l * 0.8)
    if (current && current.level !== level) { if (current.pts.length >= 2) runs[current.level].push(current.pts); current = null }
    if (level >= 0) {
      current ??= { level: Math.max(0, level), pts: [] }
      current.pts.push([s.x * sx, s.y + 0.35])
    }
  }
  if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
  const rims = runs.flatMap((paths, i) => paths.map((points) => ({ points, rgb: rimTone, alpha: levels[i] })))
  return { shade, lit, rims }
}
