//# allFunctionsCalledOnLoad
import type { RGB, WorldState } from '../../world/types'
import { nearGroundTone } from './landColour'
import { darken, labOf, lightness, mixRgb, rgbOf, rgbOfLab } from './tone'

/**
 * Ambient mood, wet-ground attenuation and Koschmieder aerial-perspective veil construction (Stage 3).
 *
 * Physical basis:
 * - Aerial perspective: `AERIAL · air.fade(km)²` (Koschmieder contrast decay from hourly visibility/dust).
 * - Wet-ground darkening: thin water films on porous soil/rock cause internal reflection and absorption,
 *   reducing diffuse reflectance by ~35–50 % linearly (Twomey et al. 1986; Lekner & Dorf 1988). Modelled
 *   as multiplicative sRGB attenuation `(1 - WET_ATTEN * wet)` (`0.76` at `wet = 1`, ~45 % linear drop)
 *   applied BEFORE aerial haze so every land tone (from dark pine `L = 0.23` to bright desert `L = 0.365`)
 *   darkens monotonically from dry to wet.
 */

/** How far toward the air's colour a plane at the visibility goes (the rest is the crest's own dark against the sky). */
export const AERIAL = 0.88
/** Oklab lightness of the clear-day ridge anchor (`SKY_THEMES.clearDay.ridgeNear` `#2E3B4E`), scaling ambient mood dimming. */
const DAY_RIDGE_L = 0.351
/** Multiplicative sRGB darkening factor at `wet = 1` (see header note; Twomey et al. 1986, Lekner & Dorf 1988). */
const WET_ATTEN = 0.24
/** The most the air's share in a plane's tone changes a px across (reference width): a jump spreads over >= 1/this px. */
export const HAZE_SLOPE = 0.006

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export interface LandVeil { rgb: RGB; alpha: number }

/**
 * The air's colour a plane fades toward with distance: the sky at the horizon (night-aware, from the light's palette),
 * tinted by the air itself by day (dust tan, rain grey-blue).
 */
export function hazeOf(world: WorldState): RGB {
  const { palette } = world.light
  const sky = mixRgb(rgbOf(palette.mid), rgbOf(palette.horizon), 0.45)
  return mixRgb(sky, world.air.haze, 0.3 * (1 - world.night.dark))
}

/**
 * Ambient mood & wet-ground veil (`source-over` onto the light-free land form), continuous across day/twilight/night/rain.
 * Composes multiplicative wet darkening `(1 - WET_ATTEN * wet)` over ambient mood dimming so dark and bright tones both
 * darken monotonically with wetness before aerial haze is added.
 */
export function moodVeilOf(world: WorldState): LandVeil {
  const raw = rgbOf(world.light.palette.ridgeNear)
  const ratio = clamp01(lightness(raw) / DAY_RIDGE_L)
  const moodAlpha = clamp01(Math.max(1 - ratio ** 2.2, 0.86 * world.night.dark))
  const wetAlpha = clamp01(WET_ATTEN * world.ground.wet)
  const alpha = clamp01(wetAlpha + moodAlpha * (1 - wetAlpha))
  if (alpha <= 1e-5) return { rgb: raw, alpha: 0 }
  const k = (moodAlpha * (1 - wetAlpha)) / alpha
  return { rgb: [raw[0] * k, raw[1] * k, raw[2] * k], alpha }
}

/** How far toward the air the ground at a distance (km) goes: `AERIAL · fade(km)²`. */
export const hazeAt = (world: WorldState, km: number) => AERIAL * world.air.fade(km) ** 2

/** Exact `source-over` composition of aerial haze (`t`) over the ambient mood + wet-ground veil. */
export function veilOfHaze(world: WorldState, haze: RGB): (t: number) => LandVeil {
  const mood = moodVeilOf(world)
  return (t) => {
    const a = clamp01(t + mood.alpha * (1 - t))
    if (a <= 1e-5) return { rgb: haze, alpha: 0 }
    const m = mood.alpha * (1 - t)
    return {
      rgb: [(haze[0] * t + mood.rgb[0] * m) / a, (haze[1] * t + mood.rgb[1] * m) / a, (haze[2] * t + mood.rgb[2] * m) / a],
      alpha: a,
    }
  }
}

/** Applies a `source-over` veil onto a light-free land tone (matches Canvas 2D compositing of `light` over `form`). */
export function applyVeil(base: RGB, veil: LandVeil): RGB {
  const a = veil.alpha, inv = 1 - a
  return [base[0] * inv + veil.rgb[0] * a, base[1] * inv + veil.rgb[1] * a, base[2] * inv + veil.rgb[2] * a]
}

/** The source-over mood + wet-ground + aerial haze veil at distance `km` (shared by planes and outside ground). */
export function veilAt(world: WorldState, km: number, haze = hazeOf(world)): LandVeil {
  return veilOfHaze(world, haze)(hazeAt(world, km))
}

/**
 * The ground's tone at a distance (km): the place's living-land base tone carried through the scene's ambient mood,
 * wet-ground darkening and Koschmieder aerial perspective (`air.fade`) toward the air.
 */
export function toneAt(world: WorldState, km: number, haze = hazeOf(world)): RGB {
  return applyVeil(nearGroundTone(world), veilOfHaze(world, haze)(hazeAt(world, km)))
}

/**
 * Land-independent ambient ridge tone at distance `km` (palette + wet + aerial haze): used while the land is not
 * known yet (`loading.ts`) so loading mist and forming lines keep identical keys before and through arrival.
 */
export function ambientToneAt(world: WorldState, km: number, haze = hazeOf(world)): RGB {
  const wet = world.ground.wet
  const raw = rgbOf(world.light.palette.ridgeNear)
  const near = wet > 0 ? darken(raw, 1 - WET_ATTEN * wet, 1 + 0.2 * wet) : raw
  return mixRgb(near, haze, hazeAt(world, km))
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
 * Aerial perspective for anything on the land (water, far towns): its own colour carried toward the air by the same rule
 * as the ground (`AERIAL · fade(km)²`, Koschmieder from the visibility), so everything at one distance fades alike.
 */
export function aerialFor(world: WorldState, haze = hazeOf(world)): (rgb: RGB, km: number) => RGB {
  const air = labOf(haze)
  return (rgb, km) => {
    const t = hazeAt(world, km)
    const own = labOf(rgb)
    return rgbOfLab({ l: own.l + (air.l - own.l) * t, a: own.a + (air.a - own.a) * t, b: own.b + (air.b - own.b) * t })
  }
}
