import { toSrgb } from './tone'
import type { RGB } from '../../world/types'
import type { Surroundings } from './buildingGround'
import { linearRgbToSrgb, shadeLinearRgb } from './landRadiance'

// Interpolated in linear light. At this spacing the sRGB error is below 0.01 byte.
const LEVELS = 4096
const encodeTable = Float64Array.from({ length: LEVELS + 1 }, (_, i) => toSrgb(i / LEVELS))
function encode(value: number) {
  const x = Math.max(0, Math.min(1, value)) * LEVELS
  const i = Math.min(LEVELS - 1, x | 0)
  return encodeTable[i] + (encodeTable[i + 1] - encodeTable[i]) * (x - i)
}

const NO_BEAM: RGB = [0, 0, 0]
type Exposure = (rho: RGB, light: RGB) => RGB

function expose(rho: RGB, light: RGB, horizon: number, haze = 0, air?: RGB) {
  return shadeLinearRgb(rho, NO_BEAM, NO_BEAM, light, 0, 0, 1, horizon, haze, air)
}

export function colorOf({ irr, air }: Surroundings, haze: number): Exposure {
  return (rho, light) => linearRgbToSrgb(expose(rho, light, irr.yHorizon, haze, air))
}

/** Reuse exposure of the same material and incident light across distance tiers. */
export function exposedColors({ irr, air }: Surroundings) {
  const cache = new WeakMap<RGB, WeakMap<RGB, RGB>>()
  return (haze: number): Exposure => {
    const displayed = new WeakMap<RGB, WeakMap<RGB, RGB>>()
    return (rho, light) => {
      let colors = displayed.get(light)
      if (!colors) displayed.set(light, colors = new WeakMap())
      let color = colors.get(rho)
      if (color) return color
      let materials = cache.get(light)
      if (!materials) cache.set(light, materials = new WeakMap())
      let rgb = materials.get(rho)
      if (!rgb) materials.set(rho, rgb = expose(rho, light, irr.yHorizon))
      color = [encode(rgb[0] + (air[0] - rgb[0]) * haze), encode(rgb[1] + (air[1] - rgb[1]) * haze),
        encode(rgb[2] + (air[2] - rgb[2]) * haze)]
      colors.set(rho, color)
      return color
    }
  }
}
