import { smoothstep } from '../../domain/smoothstep'
import { toSrgb } from './tone'
import type { RGB } from '../../world/types'
import type { BuildingSurroundings } from './buildingGround'
import { linearLuminance, linearRgbToSrgb, shadeLinearRgb } from './landRadiance'

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

export const facadeTwilight = (sunAlt: number) => smoothstep(-18, -12, sunAlt) * smoothstep(15, 6, sunAlt)

function facadeScale(rgb: RGB, streetY: number, twilight: number) {
  if (!twilight || streetY <= 0) return 1
  const y = linearLuminance(rgb)
  if (y <= streetY) return 1
  // A soft shoulder on positive contrast keeps sunless facades in the local
  // land light. Retain small differences in plaster and view through twilight.
  const excess = y - streetY
  return 1 - twilight * (excess / y) * (excess / (excess + .3 * streetY))
}

function expose(rho: RGB, light: RGB, horizon: number, haze = 0, air?: RGB) {
  return shadeLinearRgb(rho, NO_BEAM, NO_BEAM, light, 0, 0, 1, horizon, haze, air)
}

export function colorOf({ irr, air, streetY }: BuildingSurroundings, haze: number, facade = false): Exposure {
  const twilight = facade ? facadeTwilight(irr.sunAlt) : 0
  if (!twilight) return (rho, light) => linearRgbToSrgb(expose(rho, light, irr.yHorizon, haze, air))
  return (rho, light) => {
    const rgb = expose(rho, light, irr.yHorizon, haze, air)
    const scale = facadeScale(rgb, streetY, twilight)
    return linearRgbToSrgb([rgb[0] * scale, rgb[1] * scale, rgb[2] * scale])
  }
}

/** Reuse exposure of the same material and incident light across distance tiers. */
export function exposedColors({ irr, air, streetY }: BuildingSurroundings) {
  const cache = new WeakMap<RGB, WeakMap<RGB, RGB>>()
  const twilight = facadeTwilight(irr.sunAlt)
  return (haze: number, facade = false): Exposure => {
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
      const lit: RGB = [rgb[0] + (air[0] - rgb[0]) * haze, rgb[1] + (air[1] - rgb[1]) * haze,
        rgb[2] + (air[2] - rgb[2]) * haze]
      const scale = facadeScale(lit, streetY, facade ? twilight : 0)
      color = [encode(lit[0] * scale), encode(lit[1] * scale), encode(lit[2] * scale)]
      colors.set(rho, color)
      return color
    }
  }
}
