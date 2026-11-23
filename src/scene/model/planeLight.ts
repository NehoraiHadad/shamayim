//# allFunctionsCalledOnLoad
import { smoothstep } from '../../world/ridgeLighting'
import { SHADING } from '../../world/livingLight'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, RGB, WorldState } from '../../world/types'
import type { PlaneName } from './faceProjection'
import { landBoxKey, layerKey } from './keys'
import { nearGroundTone } from './landColour'
import { lightTintOf, snowOf } from './landSnow'
import { applyVeil, hazeAlong, hazeAt, hazeOf, veilOfHaze } from './landVeil'
import { capped, crestLightOf } from './planeCrestLight'
import { lightness, mixRgb, rgbOf } from './tone'
import type { PlaneLight, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

/**
 * The light part of a plane (§1d's scrub split): mood/wet/aerial veil (`landVeil.ts`), lit and shaded crest washes
 * (`planeCrestLight.ts`), floor shadow, crest rim, lying snow (`landSnow.ts`) and canopy/gully lift.
 */
export function planeLight(
  world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, k: number, base = nearGroundTone(world),
): PlaneLight {
  const { light } = world
  const sx = box.width / SCENE_W
  const haze = hazeOf(world)

  const kms = plane.hazeKm ?? plane.distanceKm
  const shares = hazeAlong(plane.points.map(([x]) => x), kms.map((km) => hazeAt(world, km)))
  const veilOf = veilOfHaze(world, haze)
  const every = Math.max(1, Math.round(plane.points.length / 24))
  const veil: [number, RGB, number][] = []
  plane.points.forEach(([x], i) => {
    if (i % every === 0 || i === plane.points.length - 1) {
      const v = veilOf(shares[i])
      veil.push([x * sx, v.rgb, v.alpha])
    }
  })

  const tint = applyVeil(base, veilOf(hazeAt(world, median(plane.distanceKm))))
  const sky = rgbOf(light.palette.horizon)
  const lightTint = lightTintOf(world)
  const cap = Math.min(lightness(tint) + (name === 'near' ? 0.12 : 0.1), lightness(sky) - 0.05)
  const strength = clamp01(light.direct * 1.3)
  const fadeIn = smoothstep(SHADING[0] * 1.3, SHADING[1] * 0.5, strength)

  const crest = crestLightOf(world, name, plane, sx, k, tint, sky, lightTint, cap, strength, fadeIn)
  const snow = snowOf(world, box, name, light.ray ? strength : 0, lightTint)
  const rims = snow ? crest.rims.map((rim) => ({ ...rim, rgb: mixRgb(snow.rgb, [1, 1, 1], 0.4) })) : crest.rims

  const sideOf = Math.max(-1, Math.min(1, light.dir.across / 0.25))
  const lift = fadeIn > 0 && Math.abs(sideOf) > 0.02
    ? { dx: sideOf, dy: -0.7, rgb: capped(tint, mixRgb(lightTint, [1, 1, 1], 0.35), 0.85, cap + 0.06),
      alpha: Math.min(0.6, 0.12 + 0.6 * strength) * fadeIn * Math.min(1, Math.abs(sideOf) * 2) * k }
    : null
  const key = layerKey('plane.light', name, world.keys.terrain, world.keys.light, world.keys.air, world.keys.ground,
    world.keys.night, world.keys.land, world.snow, landBoxKey(box))
  return { key, blend: 'source-over', veil, shade: crest.shade, lit: crest.lit, faces: crest.faces, rims, snow, lift }
}
