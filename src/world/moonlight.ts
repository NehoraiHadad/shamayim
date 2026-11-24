import { lateral, SCENE_CAMERA, type Camera } from '../domain/camera'
import { ridgeLightRay, smoothstep } from './ridgeLighting'
import type { RidgeTone } from './ridgeLightTone'
import { solarBeam, sunLight, type Aerosol } from './sceneLight'
import type { RGB } from './types'

export interface MoonSky { altitude: number; azimuth: number; fraction: number }

/** How much of white stays in the low moon's colour: copper on the horizon, not a flat red. */
const COPPER = 0.25
/** A bright day's air in front of the moon adds its own light, so the tint shows this much less. */
const DAY_WASH = 0.75
/** The dark eye follows a dimming disc: it sees about this power of the light lost. */
const EYE_POWER = 0.2

/**
 * What the air does to the moon's own look at this altitude: the sun's light path and aerosol (`sunLight`, `solarBeam`),
 * taken against the same air at the zenith, so a high moon keeps its bone colour and haze (already in `farFade`) is not
 * counted twice. `tint` multiplies a colour (strongest channel 1), `dim` a strength.
 */
export function moonAir(altitude: number, air: Aerosol, daylight = 0): { tint: RGB; dim: number } {
  const low = sunLight(Math.max(0, altitude), air), high = sunLight(90, air)
  const white = COPPER + (1 - COPPER) * DAY_WASH * daylight
  const raw = low.rgb.map((v, i) => v / high.rgb[i])
  const top = Math.max(...raw)
  const tint = raw.map((v) => white + (1 - white) * v / top) as RGB
  const lost = low.strength / Math.max(1e-6, solarBeam(90, air).strength)
  return { tint, dim: Math.min(1, lost) ** (EYE_POWER * (1 - daylight)) }
}

/** A colour seen through air of this tint. */
export const tinted = (rgb: RGB, tint: RGB): RGB => [rgb[0] * tint[0], rgb[1] * tint[1], rgb[2] * tint[2]]

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
