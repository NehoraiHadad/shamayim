import { smoothstep } from '../../domain/smoothstep'
import { skyContrastCeiling } from '../../theme/contrast'
import type { WorldState } from '../../world/types'
import { cityOnSky } from './cityLight'
import { luminanceOf } from './cloudChromaticity'
import { dustSky, dustVeilWeight } from './cloudDust'
import { labOf, linearOfLab, rgbOf, toLinear, toSrgb } from './tone'
import type { RGB } from './types'

type Stops = { top: RGB; mid: RGB; horizon: RGB }
const BYTE = 1 / 255
const WHITE: RGB = [1, 1, 1]

function atLightness(l: number, a: number, b: number): RGB {
  const linear = (chroma: number) => linearOfLab({ l, a: a * chroma, b: b * chroma })
  const inGamut = (rgb: RGB) => rgb.every((c) => c >= 0 && c <= 1)
  let rgb = linear(1)
  if (!inGamut(rgb)) {
    let low = 0, high = 1
    // Reduce chroma along the constant-hue ray, to a fraction of a channel byte.
    while (high - low > BYTE / 16) {
      const mid = (low + high) / 2
      if (inGamut(linear(mid))) low = mid
      else high = mid
    }
    rgb = linear(low)
  }
  return [toSrgb(rgb[0]), toSrgb(rgb[1]), toSrgb(rgb[2])]
}

/** Display exposure acts on OKLab lightness. The identity also bypasses colour conversion. */
export function exposeDust(rgb: RGB, exposure: number): RGB {
  if (exposure === 1) return rgb
  const { l, a, b } = labOf(rgb)
  return atLightness(l * exposure, a, b)
}

// Asymmetric quadratic soft minimum. Wrap one sRGB code value around the ceiling,
// leaving half a code value for rounding in the CSS and canvas colours.
function targetFor(y: number, ceiling: number, weight: number) {
  // The maximum slope of the sRGB decoding curve is 2.4 / 1.055 at white.
  // Introduce the rounding allowance over the first byte of visible veil.
  const rounding = BYTE * 0.5 * 2.4 / 1.055 * smoothstep(0, BYTE, weight)
  const cap = Math.max(0, ceiling - rounding)
  const start = cap - rounding
  if (cap === start) return Math.min(y, cap)
  const x = Math.max(0, Math.min(1, (y - start) / (2 * rounding)))
  return x === 1 ? cap : y - rounding * x * x
}

function factorFor(rgb: RGB, ceiling: number, weight: number) {
  const y = luminanceOf(rgb)
  const target = targetFor(y, ceiling, weight)
  if (target === y) return 1
  const { l, a, b } = labOf(rgb)
  let low = 0, high = 1
  // Resolve the lightness multiplier to finer than an sRGB byte, even near black.
  while (high - low > BYTE * toLinear(BYTE) ** (1 / 3)) {
    const middle = (low + high) / 2
    if (luminanceOf(atLightness(l * middle, a, b)) <= target) low = middle
    else high = middle
  }
  const yAt = (factor: number) => luminanceOf(atLightness(l * factor, a, b))
  const lower = yAt(low), upper = yAt(high)
  return upper > lower ? low + (high - low) * ((target - lower) / (upper - lower)) : low
}

function computeColours(world: WorldState) {
  const { palette } = world.light
  const veiled = dustSky(world)
  const [t, m, h] = veiled ?? [rgbOf(palette.top), rgbOf(palette.mid), rgbOf(palette.horizon)]
  const physical: Stops = { top: cityOnSky(world, t, 90), mid: cityOnSky(world, m, 30), horizon: cityOnSky(world, h, 0) }
  if (!veiled) return { ...physical, physical, bandWeight: 0, exposure: 1, cloudWhite: undefined }
  const bandWeight = dustVeilWeight(world, 0)
  const ceiling = skyContrastCeiling(palette.ink)
  const exposure = Math.min(factorFor(physical.top, ceiling, bandWeight),
    factorFor(physical.mid, Math.min(ceiling, skyContrastCeiling('#E8F9FF')), bandWeight))
  return { top: exposeDust(physical.top, exposure), mid: exposeDust(physical.mid, exposure),
    horizon: exposeDust(physical.horizon, exposure), physical, bandWeight, exposure,
    cloudWhite: exposure === 1 ? undefined : exposeDust(WHITE, exposure)[0] }
}

const cache = new WeakMap<WorldState, ReturnType<typeof computeColours>>()

export function skyColours(world: WorldState) {
  const hit = cache.get(world)
  if (hit) return hit
  const colours = computeColours(world)
  cache.set(world, colours)
  return colours
}
