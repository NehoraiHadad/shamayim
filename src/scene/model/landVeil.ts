//# allFunctionsCalledOnLoad
import { wrap180 } from '../../domain/camera'
import { smoothstep } from '../../world/ridgeLighting'
import type { RGB, WorldState } from '../../world/types'
import { nearGroundAlbedo } from './landColour'
import {
  FLAT_NORMAL, linearLuminance, linearRgbToSrgb, litLandRgb, srgbRgbToLinear, unitChroma, WET_REFLECTANCE_DROP,
} from './landRadiance'
import { mixLight, mixRgb, rgbOf, scaleLight } from './tone'

/**
 * Koschmieder aerial-perspective haze and shared lit ground tones (Stages 3 & 7).
 *
 * Physical basis:
 * - Aerial perspective: `air.fade(km)²` scaled by the clear-weather contrast floor, which vanishes in dense fog,
 *   composited in linear light: `L = L_0 · (1 − h) + L_air · h` (`mixLight`).
 * - Wet-ground darkening: `×(1 − 0.45 · wet)` linear reflectance attenuation (Twomey et al. 1986;
 *   Lekner & Dorf 1988), applied in `landRadiance.ts` for known land and here for `ambientToneAt`.
 * - Cloud cover is NEVER applied here via `palette.ridgeNear`: direct/diffuse light and discrete cloud
 *   shadows in `landRadiance.ts` + `cloudShadows.ts` already account for clouds once.
 */

/** How far toward the air's colour a plane at the visibility goes (the rest is the crest's own dark against the sky). */
export const AERIAL = 0.88
/** The most the air's share in a plane's tone changes a px across (reference width): a jump spreads over >= 1/this px. */
export const HAZE_SLOPE = 0.006

/**
 * The air's colour a plane fades toward with distance: the sky at the horizon (night-aware, from the light's palette),
 * tinted by the air itself by day (dust tan, rain grey-blue).
 */
const hazeCache = new WeakMap<WorldState, RGB>()

export function hazeOf(world: WorldState): RGB {
  const hold = hazeCache.get(world)
  if (hold) return hold
  const { palette, afterglow } = world.light
  const { altitude, azimuth } = world.bodies.sun
  const towards = (0.5 + 0.5 * Math.cos(wrap180(azimuth - world.camera.heading) * Math.PI / 180)) ** 3
  const glow = towards * smoothstep(7, 1, altitude) * smoothstep(-10, -3, altitude) * (1 - 0.65 * world.light.diffuse)
  const horizon = rgbOf(palette.horizon)
  const sky = mixRgb(rgbOf(palette.mid), horizon, 0.45)
  const w = 0.3 * (1 - world.night.dark)
  if (w <= 1e-4) return sky
  // Aerosol (`air.haze`) tints the path-scattered sky's chromaticity at the sky's own luminance (never injects daytime brightness at dusk).
  const skyLin = srgbRgbToLinear(sky), ySky = linearLuminance(skyLin)
  const scatter = unitChroma(world.air.haze)
  const glowTint = unitChroma(afterglow?.rgb ?? horizon)
  // Bearing changes the warm path chromaticity at twilight. Its luminance is set by the broad sky.
  const tint = scatter.map((value, i) => value + (glowTint[i] - value) * glow)
  const rgb = linearRgbToSrgb([
    skyLin[0] * (1 - w) + ySky * tint[0] * w,
    skyLin[1] * (1 - w) + ySky * tint[1] * w,
    skyLin[2] * (1 - w) + ySky * tint[2] * w,
  ])
  hazeCache.set(world, rgb)
  return rgb
}

/** The illustrated palette retains the original aerial contrast floor. */
export const illustratedHazeAt = (world: WorldState, km: number) => AERIAL * world.air.fade(km) ** 2

/** Dense fog removes the clear-weather contrast floor for every land receiver. */
export function hazeAt(world: WorldState, km: number) {
  const { air } = world
  return (AERIAL + (1 - AERIAL) * (air.mist?.fog ?? 0)) * air.fade(km) ** 2
}

/**
 * The ground's physically lit tone at distance `km`: the place's living-land albedo through `landRadiance`
 * (direct + diffuse irradiance, linear wetness, horizon-relative exposure & compression) and linear Koschmieder haze.
 */
export function toneAt(world: WorldState, km: number, haze = hazeOf(world)): RGB {
  return litLandRgb(world, nearGroundAlbedo(world), FLAT_NORMAL, hazeAt(world, km), haze)
}

/**
 * Land-independent ambient ridge tone at distance `km` (palette + linear wet + linear Koschmieder haze): used while
 * the land is not known yet (`loading.ts`) so loading mist and forming lines keep identical keys before and through arrival.
 */
export function ambientToneAt(world: WorldState, km: number, haze = hazeOf(world)): RGB {
  const wet = Math.min(1, Math.max(0, world.ground.wet))
  const raw = rgbOf(world.light.palette.ridgeNear)
  const near = wet > 0 ? scaleLight(raw, 1 - WET_REFLECTANCE_DROP * wet) : raw
  return mixLight(near, haze, hazeAt(world, km))
}

/**
 * The air's share along a crest, continuous across a jump in distance: no steeper than `HAZE_SLOPE` a px.
 * The mean of the lowest and highest curve within that slope of the shares (two passes each way).
 */
export function hazeAlong(xs: readonly number[], shares: readonly number[], slope = HAZE_SLOPE): number[] {
  const n = shares.length
  const low = [...shares], high = [...shares]
  for (let i = 1; i < n; i++) {
    const d = slope * Math.abs(xs[i] - xs[i - 1])
    low[i] = Math.min(low[i], low[i - 1] + d)
    high[i] = Math.max(high[i], high[i - 1] - d)
  }
  for (let i = n - 2; i >= 0; i--) {
    const d = slope * Math.abs(xs[i + 1] - xs[i])
    low[i] = Math.min(low[i], low[i + 1] + d)
    high[i] = Math.max(high[i], high[i + 1] - d)
  }
  return low.map((v, i) => (v + high[i]) / 2)
}

/**
 * Linear-light Koschmieder aerial perspective for anything on the land (water, far towns, marks): mixes in linear light
 * toward `haze` by the shared haze fraction so every receiver at one distance fades alike without sRGB darkening.
 */
export function aerialFor(world: WorldState, haze = hazeOf(world)): (rgb: RGB, km: number) => RGB {
  return (rgb, km) => mixLight(rgb, haze, hazeAt(world, km))
}
