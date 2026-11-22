//# allFunctionsCalledOnLoad
import { EXAGGERATION, smoothstep } from '../../world/ridgeLighting'
import { SHADING } from '../../world/livingLight'
import { SCENE_W } from '../../world/sceneBox'
import { clearanceOf, groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { faceAtY, localFootY, type PlaneName } from './faceProjection'
import { landBoxKey, layerKey } from './keys'
import { nearGroundAlbedo } from './landColour'
import {
  FLAT_NORMAL, lightMultiplierRgb, linearHazeAlpha, linearLuminance, litLandLinear, litLandRgb, srgbRgbToLinear, surfaceNormal,
} from './landRadiance'
import { lightTintOf, snowOf } from './landSnow'
import { hazeAlong, hazeAt, hazeOf } from './landVeil'
import { crestLightOf } from './planeCrestLight'
import { mixLight, mixRgb } from './tone'
import type { PlaneLight, PlaneShadeField, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

const SHADE_SPEC: Record<PlaneName, { cols: number; rows: number }> = {
  near: { cols: 25, rows: 4 },
  far: { cols: 25, rows: 2 },
  back: { cols: 13, rows: 1 },
}

/**
 * Computes the full-face linear-light irradiance multiplier grid (`PlaneShadeField`, Band 0 `multiply`) from real 3D
 * surface normals: across slope from the crest profile (divided by `EXAGGERATION`), ahead slope from DEM faces
 * (`faceAtY`), plus ridge self-shadowing (`clearanceOf`).
 */
export function planeShadeFieldOf(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane): PlaneShadeField {
  const { cols, rows } = SHADE_SPEC[name]
  const rgb = new Uint8Array(cols * rows * 3)
  const crest = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
  const ray = world.light.ray
  for (let c = 0; c < cols; c++) {
    const x = (cols > 1 ? c / (cols - 1) : 0.5) * SCENE_W
    const crestY = lineAt(plane.points, x)
    const footY = localFootY(world, name, x, crestY, box.landHeight)
    const xL = Math.max(0, x - 4), xR = Math.min(SCENE_W, x + 4)
    const acrossSlope = ((lineAt(plane.points, xL) - lineAt(plane.points, xR)) / Math.max(1e-3, xR - xL)) / EXAGGERATION
    const shadow = ray ? smoothstep(0, 1, clearanceOf(crest, x, crestY, ray)) : 1
    for (let r = 0; r < rows; r++) {
      const rowFrac = rows > 1 ? r / (rows - 1) : 0
      const targetY = crestY + rowFrac * Math.max(0, footY - crestY)
      const aheadSlope = faceAtY(world, name, plane, x, crestY, footY, targetY).slope
      const mult = lightMultiplierRgb(world, surfaceNormal(acrossSlope, aheadSlope), shadow)
      const o = (r * cols + c) * 3
      rgb[o] = Math.round(mult[0] * 255)
      rgb[o + 1] = Math.round(mult[1] * 255)
      rgb[o + 2] = Math.round(mult[2] * 255)
    }
  }
  return { cols, rows, rgb }
}

/**
 * The light part of a plane (§1d's scrub split + Stage 7 physical land lighting):
 * - Band 0 (`shadeField` + `faces`, `multiply`): full-face normal irradiance, wetness and floor shadows in linear light.
 * - Band 1 (`veil`, `snow`, `shade`, `lit`, `rims`, `lift`, `source-over`): linear-equivalent Koschmieder aerial haze,
 *   lying snow, soft illustrated washes, sunlit crest rims and gully/canopy catchlights.
 */
export function planeLight(
  world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, k: number, medianAlbedo = nearGroundAlbedo(world),
): PlaneLight {
  const { light } = world
  const sx = box.width / SCENE_W
  const haze = hazeOf(world)
  const shadeField = planeShadeFieldOf(world, box, name, plane)

  // Pure Koschmieder aerial haze veil with linear-equivalent sRGB alpha (wetness & sun/night live in `shadeField`).
  const kms = plane.hazeKm ?? plane.distanceKm
  const shares = hazeAlong(plane.points.map(([x]) => x), kms.map((km) => hazeAt(world, km)))
  const landLinY = linearLuminance(litLandLinear(world, medianAlbedo, FLAT_NORMAL))
  const airLinY = linearLuminance(srgbRgbToLinear(haze))
  const every = Math.max(1, Math.round(plane.points.length / 24))
  const veil: [number, RGB, number][] = []
  plane.points.forEach(([x], i) => {
    if (i % every === 0 || i === plane.points.length - 1) {
      veil.push([x * sx, haze, linearHazeAlpha(shares[i], landLinY, airLinY)])
    }
  })

  const medHaze = hazeAt(world, median(plane.distanceKm))
  const lightTint = lightTintOf(world)
  const strength = clamp01(light.direct * 1.3)
  const fadeIn = smoothstep(SHADING[0] * 1.3, SHADING[1] * 0.5, strength)

  const crest = crestLightOf(world, box, name, plane, sx, k, medianAlbedo, medHaze, haze, strength, fadeIn)
  const snow = snowOf(world, box, name, light.ray ? strength : 0, lightTint)
  const rims = snow ? crest.rims.map((rim) => ({ ...rim, rgb: mixRgb(snow.rgb, [1, 1, 1], 0.4) })) : crest.rims

  const sideOf = Math.max(-1, Math.min(1, light.dir.across / 0.25))
  const liftAcross = -Math.sign(light.dir.across || 1) * 0.3
  const liftRgb = mixLight(litLandRgb(world, medianAlbedo, surfaceNormal(liftAcross, 0.05), medHaze, haze, 1), [1, 1, 1], 0.25)
  const lift = fadeIn > 0 && Math.abs(sideOf) > 0.02
    ? { dx: sideOf, dy: -0.7, rgb: liftRgb, alpha: Math.min(0.55, 0.12 + 0.55 * strength) * fadeIn * Math.min(1, Math.abs(sideOf) * 2) * k }
    : null
  const key = layerKey('plane.light', name, world.keys.terrain, world.keys.light, world.keys.air, world.keys.ground,
    world.keys.night, world.keys.land, world.snow, landBoxKey(box))
  return { key, blend: 'source-over', shadeField, veil, shade: crest.shade, lit: crest.lit, faces: crest.faces, rims, snow, lift }
}
