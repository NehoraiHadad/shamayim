import type { WorldState, RGB } from '../../world/types'
import { COVER_WATER, nonWaterLocalFallback, roundRgb } from './landPalette'
import { illustratedHazeAt as hazeAt } from './landVeil'
import { labOf, lightness, mixRgb, rgbOf, rgbOfLab } from './tone'

/** The drawn hand's original aerial perspective and the ground reference used to fade its far glyphs. */
const DAY_RIDGE_L = 0.351, WET_ATTEN = 0.24
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
interface LandVeil { rgb: RGB; alpha: number }

const REF_ALBEDO_L = 0.48, REF_DAY_RIDGE_L = 0.312, LIGHTNESS_SLOPE = 0.58
const MIN_LAND_L = 0.23, MAX_LAND_L = 0.365, CHROMA_BOOST = 1.35

export function drawnHazeOf(world: WorldState): RGB {
  const { palette } = world.light
  const sky = mixRgb(rgbOf(palette.mid), rgbOf(palette.horizon), 0.45)
  return mixRgb(sky, world.air.haze, 0.3 * (1 - world.night.dark))
}

/** Converts one light-free BOA sRGB albedo into an illustrated, light-free land tone (Oklab calibrated). */
function albedoToLandTone(albedo: RGB): RGB {
  const lab = labOf(albedo)
  const l = Math.min(MAX_LAND_L, Math.max(MIN_LAND_L, REF_DAY_RIDGE_L + (lab.l - REF_ALBEDO_L) * LIGHTNESS_SLOPE))
  return roundRgb(rgbOfLab({ l, a: lab.a * CHROMA_BOOST, b: lab.b * CHROMA_BOOST }))
}

export function drawnAerialFor(world: WorldState, haze = drawnHazeOf(world)): (rgb: RGB, km: number) => RGB {
  const air = labOf(haze)
  return (rgb, km) => {
    const t = hazeAt(world, km)
    const own = labOf(rgb)
    return rgbOfLab({ l: own.l + (air.l - own.l) * t, a: own.a + (air.a - own.a) * t, b: own.b + (air.b - own.b) * t })
  }
}

function moodVeilOf(world: WorldState): LandVeil {
  const raw = rgbOf(world.light.palette.ridgeNear)
  const ratio = clamp01(lightness(raw) / DAY_RIDGE_L)
  const moodAlpha = clamp01(Math.max(1 - ratio ** 2.2, 0.86 * world.night.dark))
  const wetAlpha = clamp01(WET_ATTEN * world.ground.wet)
  const alpha = clamp01(wetAlpha + moodAlpha * (1 - wetAlpha))
  if (alpha <= 1e-5) return { rgb: raw, alpha: 0 }
  const k = (moodAlpha * (1 - wetAlpha)) / alpha
  return { rgb: [raw[0] * k, raw[1] * k, raw[2] * k], alpha }
}

/** Exact `source-over` composition of aerial haze (`t`) over the ambient mood + wet-ground veil. */
function veilOfHaze(world: WorldState, haze: RGB): (t: number) => LandVeil {
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
function applyVeil(base: RGB, veil: LandVeil): RGB {
  const a = veil.alpha, inv = 1 - a
  return [base[0] * inv + veil.rgb[0] * a, base[1] * inv + veil.rgb[1] * a, base[2] * inv + veil.rgb[2] * a]
}

const ownCache = new WeakMap<WorldState['land'], RGB>()

export function drawnGroundToneAt(world: WorldState, km: number): RGB {
  let tone = ownCache.get(world.land)
  if (!tone) {
    const local = world.land.local.filter(({ sample }) => sample.cover !== COVER_WATER)
    const albedos = local.length ? local.map(({ sample }) => sample.albedo) : [nonWaterLocalFallback(world.land).albedo]
    const tones = albedos.map(albedoToLandTone).sort((a, b) => lightness(a) - lightness(b))
    tone = tones[Math.floor(tones.length / 2)]
    ownCache.set(world.land, tone)
  }
  return applyVeil(tone, veilOfHaze(world, drawnHazeOf(world))(hazeAt(world, km)))
}
