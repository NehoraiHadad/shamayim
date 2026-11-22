//# allFunctionsCalledOnLoad
import { lateral } from '../../domain/camera'
import { SHADING } from '../../world/livingLight'
import { ridgeLightRay, smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import { clearanceOf, groundAt as lineAt } from '../../world/sceneLight'
import { shadowRuns } from '../../world/shadowRuns'
import type { Plane, RGB, WorldState } from '../../world/types'
import { type PlaneName } from './faceProjection'
import { landBoxKey, layerKey } from './keys'
import { nearGroundAlbedo } from './landColour'
import {
  dirAtBearing, FLAT_NORMAL, landIrradiance, linearRgbToSrgb, litLandRgb, SNOW_ALBEDO_LIN, srgbRgbToLinear, surfaceNormal,
  type LandIrradiance,
} from './landRadiance'
import { snowMaskOf } from './landSnow'
import { hazeAlong, hazeAt, hazeOf } from './landVeil'
import { crestLightOf } from './planeCrestLight'
import { planeGeomOf, type PlaneGeomGrid } from './planeGeometry'
import { mixLight, mixRgb } from './tone'
import type { Face, PlaneLight, PlaneLitField, Pt, SceneBox, SnowCap } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

/** Builds the compact `PlaneLitField` (hoisted irradiance, per-column normals/visibility, per-sample haze, snow, lit veg). */
export function planeLitFieldOf(
  world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, geom: PlaneGeomGrid,
  irr: LandIrradiance, rawVegTones: readonly RGB[], haze: RGB,
): PlaneLitField {
  const { cols, rows, xs, crestY, footY, bearing, nx, ny, nz, km } = geom
  const grid = new Uint8Array(cols * rows * 4)
  const crest = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
  const handed = world.camera.handed
  const hasSun = irr.eSunPi > 1e-5, hasMoon = irr.eMoonPi > 1e-5

  const runs = name === 'near' && hasSun && world.light.ray
    ? shadowRuns(crest, world.light.ray).filter(([a, b]) => b - a >= 12) : []
  const floorVisAt = (x: number, dy: number) => {
    if (!runs.length || dy > 18) return 1
    let inside = 0
    for (const [a, b] of runs) if (x >= a - 4 && x <= b + 4) {
      inside = Math.max(inside, Math.min(smoothstep(a - 4, a + 4, x), smoothstep(b + 4, b - 4, x)) * (1 - smoothstep(10, 18, dy)))
    }
    return 1 - 0.85 * inside
  }

  const xsArr = Array.from(xs)
  const hazeRows = Array.from({ length: rows }, (_, r) =>
    hazeAlong(xsArr, Array.from({ length: cols }, (_, c) => hazeAt(world, km[r * cols + c]))))

  const rawSunVis = new Float32Array(cols), rawMoonVis = new Float32Array(cols)
  for (let c = 0; c < cols; c++) {
    const x = xs[c], cy = crestY[c]
    const sunRay = hasSun ? ridgeLightRay(lateral(irr.sunAz, { ...world.camera, heading: bearing[c] }), Math.max(0.5, irr.sunAlt)) : null
    const moonRay = hasMoon ? ridgeLightRay(lateral(irr.moonAz, { ...world.camera, heading: bearing[c] }), Math.max(0.5, irr.moonAlt)) : null
    rawSunVis[c] = sunRay ? smoothstep(0, 1, clearanceOf(crest, x, cy, sunRay)) : 1
    rawMoonVis[c] = moonRay ? smoothstep(0, 1, clearanceOf(crest, x, cy, moonRay)) : 1
  }
  const smoothAt = (arr: Float32Array, c: number) =>
    0.25 * arr[Math.max(0, c - 1)] + 0.5 * arr[c] + 0.25 * arr[Math.min(cols - 1, c + 1)]

  for (let c = 0; c < cols; c++) {
    const x = xs[c], cy = crestY[c], fy = footY[c]
    const sDir = hasSun ? dirAtBearing(irr.sunAz, irr.sunAlt, bearing[c], handed) : irr.sunDir
    const mDir = hasMoon ? dirAtBearing(irr.moonAz, irr.moonAlt, bearing[c], handed) : irr.moonDir
    const cSunVis = smoothAt(rawSunVis, c), cMoonVis = smoothAt(rawMoonVis, c)
    for (let r = 0; r < rows; r++) {
      const idx = r * cols + c, dy = (rows > 1 ? r / (rows - 1) : 0) * Math.max(0, fy - cy)
      const crestReach = 1 - smoothstep(10, 32, dy)
      const sunVis = 1 - (1 - cSunVis) * crestReach, moonVis = 1 - (1 - cMoonVis) * crestReach
      const ux = nx[idx], uy = ny[idx], uz = nz[idx]
      const ndotlS = hasSun ? Math.max(0, ux * sDir.across + uy * sDir.ahead + uz * sDir.up) : 0
      const ndotlM = hasMoon ? Math.max(0, ux * mDir.across + uy * mDir.ahead + uz * mDir.up) : 0
      const o = idx * 4
      grid[o] = Math.round(clamp01(ndotlS * Math.min(sunVis, floorVisAt(x, dy))) * 255)
      grid[o + 1] = Math.round(clamp01(ndotlM * moonVis) * 255)
      grid[o + 2] = Math.round(clamp01((1 + uz) * 0.5) * 255)
      grid[o + 3] = Math.round(clamp01(hazeRows[r][c]) * 255)
    }
  }

  const midRow = Math.min(rows - 1, Math.floor(rows * 0.45))
  const vegHaze = hazeAt(world, median(Array.from({ length: cols }, (_, c) => km[midRow * cols + c])))
  const litTones = rawVegTones.map((albedo) => litLandRgb(world, albedo, FLAT_NORMAL, vegHaze, haze, 1))
  return {
    cols, rows, grid, eSun: irr.eSunVec, eMoon: irr.eMoonVec, eSky: irr.eSkyVec,
    hazeLin: srgbRgbToLinear(haze), yHorizon: irr.yHorizon, litTones, snow: snowMaskOf(world, box, name),
  }
}

/** The light part of a plane (Stage 7 round 2): exact single-pass `litField` + single-hazed crest accents. */
export function planeLight(
  world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, k: number,
  medianAlbedo = nearGroundAlbedo(world), rawVegTones: readonly RGB[] = [],
): PlaneLight {
  const { light } = world, sx = box.width / SCENE_W, haze = hazeOf(world)
  const geom = planeGeomOf(world, name, plane, box.landHeight)
  const irr = landIrradiance(world)
  const litField = planeLitFieldOf(world, box, name, plane, geom, irr, rawVegTones, haze)

  const medHaze = hazeAt(world, median(plane.distanceKm))
  const strength = clamp01(light.direct * 1.3)
  const fadeIn = smoothstep(SHADING[0] * 1.3, SHADING[1] * 0.5, strength)
  const crest = crestLightOf(world, box, name, plane, geom, irr, sx, k, medianAlbedo, medHaze, haze, strength, fadeIn)
  const snow: SnowCap | null = litField.snow
    ? { edge: litField.snow.edge, rgb: litLandRgb(world, linearRgbToSrgb(SNOW_ALBEDO_LIN), FLAT_NORMAL, medHaze, haze, 1, 1), alpha: litField.snow.cover }
    : null
  const rims = snow ? crest.rims.map((rim) => ({ ...rim, rgb: mixRgb(snow.rgb, [1, 1, 1], 0.35) })) : crest.rims
  const faces: Face[] = []
  if (name === 'near' && light.ray && fadeIn > 0) {
    const crestPts = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
    const shRgb = litLandRgb(world, medianAlbedo, FLAT_NORMAL, medHaze, haze, 0)
    for (const [a, b] of shadowRuns(crestPts, light.ray).filter(([a, b]) => b - a >= 12)) {
      const xs = Array.from({ length: Math.round((b - a) / 3) + 1 }, (_, i) => a + i * 3)
      faces.push({
        points: [...xs.map((x): Pt => [x * sx, lineAt(plane.points, x) - 2]), ...[...xs].reverse().map((x): Pt => [x * sx, lineAt(plane.points, x) + 16])],
        rgb: shRgb, alpha: 0.75 * clamp01(light.shares.sun) * fadeIn, soft: 4,
      })
    }
  }
  const sideOf = Math.max(-1, Math.min(1, light.dir.across / 0.25))
  const liftRgb = mixLight(litLandRgb(world, medianAlbedo, surfaceNormal(-Math.sign(light.dir.across || 1) * 0.35, 0.05), medHaze, haze, 1), [1, 1, 1], 0.28)
  const lift = fadeIn > 0 && Math.abs(sideOf) > 0.02
    ? { dx: sideOf, dy: -0.7, rgb: liftRgb, alpha: Math.min(0.55, 0.14 + 0.55 * strength) * fadeIn * Math.min(1, Math.abs(sideOf) * 2) * k }
    : null
  const key = layerKey(
    'plane.light', name, geom.geomKey, world.keys.light,
    Math.round(irr.sunAlt * 8), Math.round(irr.sunAz * 4), Math.round(irr.moonAlt * 8), Math.round(irr.moonAz * 4),
    world.keys.air, world.keys.ground, world.keys.night, world.keys.land, world.snow, landBoxKey(box),
  )
  return { key, blend: 'source-over', litField, veil: [], shade: crest.shade, lit: crest.lit, faces, rims, snow, lift }
}
