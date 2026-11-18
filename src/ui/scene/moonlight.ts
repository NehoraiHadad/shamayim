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

const SILVER = '#B9C4DE'

/**
 * The moon's tone on one ridge: only a thin silvered crest. The night eye sees no colour and little contrast on the
 * dark slopes, so there is no wash on the faces.
 */
const moonTone = (strength: number): RidgeTone => ({ fill: null, rim: SILVER, rimAlpha: .2 * strength })

/** Ridge lighting from the moon, in the same shape as the sun's, or null when it is too faint to see. */
export function moonRidgeLight(moon: MoonSky, strength: number, rimX: number) {
  if (strength < .05) return null
  const lateral = Math.sin(moon.azimuth * Math.PI / 180)
  return {
    ray: ridgeLightRay(lateral, moon.altitude),
    rimX,
    noonWeight: 0,
    altitude: moon.altitude,
    day: 0,
    near: moonTone(strength),
    far: moonTone(strength),
  }
}
