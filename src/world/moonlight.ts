import { lateral, SCENE_CAMERA, type Camera } from '../../domain/camera'
import { ridgeLightRay, smoothstep } from './ridgeLighting'
import type { RidgeTone } from './ridgeLightTone'

export interface MoonSky { altitude: number; azimuth: number; fraction: number }

/**
 * How strongly the moon lights the land and clouds (0..1). A full moon is ~400 000× fainter than the sun, so this
 * only shows once the sky is dark (sun under ~−8°); brightness falls much faster than the lit fraction (the phase
 * law: a half moon gives ~1/10 of a full one), and a low moon is dimmed by the long air path. Cloud and haze veil it.
 */
export function moonlightStrength(moon: MoonSky, sunAltitude: number, cloudCover: number, farFade: number) {
  const dark = smoothstep(-5, -10, sunAltitude)
  const phase = moon.fraction ** 2.5
  const height = smoothstep(1, 15, moon.altitude)
  return dark * phase * height * (1 - smoothstep(60, 90, cloudCover)) * (1 - .8 * farFade)
}

/**
 * The moon's tone on one ridge: no line on the crest. Moonlight is ~400 000× fainter than sunlight and the night eye
 * (rods) sees little contrast and no colour, so a moonlit hill is only a touch lighter on the faces toward the moon,
 * soft and wide; a bright crest line only appears with the moon right behind the ridge. A faint translucent wash,
 * blurred like the sun's, over whatever colour the ridge is drawn in.
 */
const moonTone = (strength: number): RidgeTone =>
  ({ fill: `rgba(185, 196, 222, ${(.09 * strength).toFixed(3)})`, rim: '#B9C4DE', rimAlpha: 0 })

/** Ridge lighting from the moon, in the same shape as the sun's, or null when it is too faint to see. */
export function moonRidgeLight(moon: MoonSky, strength: number, rimX: number, camera: Camera = SCENE_CAMERA) {
  if (strength < .05) return null
  return {
    ray: ridgeLightRay(lateral(moon.azimuth, camera), moon.altitude),
    rimX,
    noonWeight: 0,
    altitude: moon.altitude,
    day: 0,
    near: moonTone(strength),
    far: moonTone(strength),
  }
}
