//# allFunctionsCalledOnLoad
import { smoothstep } from '../../domain/smoothstep'
import { toSrgb } from './tone'
import type { RGB } from '../../world/types'
import type { BuildingSurroundings } from './buildingGround'
import { linearLuminance, shadeLinearRgb } from './landRadiance'

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

function expose(rho: RGB, light: RGB, horizon: number) {
  return shadeLinearRgb(rho, NO_BEAM, NO_BEAM, light, 0, 0, 1, horizon)
}

/** Reuse exposure of the same material and incident light across distance tiers. */
export function exposedColors({ irr, air, streetY }: BuildingSurroundings) {
  const cache = new WeakMap<RGB, WeakMap<RGB, RGB>>()
  const facadeCache = new WeakMap<RGB, RGB>()
  const twilight = facadeTwilight(irr.sunAlt)
  return (haze: number, facade = false): Exposure => {
    const displayed = new WeakMap<RGB, WeakMap<RGB, RGB>>()
    const transmits = 1 - haze
    const [red, green, blue] = [air[0] * haze, air[1] * haze, air[2] * haze]
    return (rho, light) => {
      let colors = displayed.get(light)
      if (!colors) displayed.set(light, colors = new WeakMap())
      let color = colors.get(rho)
      if (color) return color
      let materials = cache.get(light)
      if (!materials) cache.set(light, materials = new WeakMap())
      let rgb = materials.get(rho)
      if (!rgb) materials.set(rho, rgb = expose(rho, light, irr.yHorizon))
      // Exposure and street contrast act on the surface. The path's scattered
      // light comes from the same air as the ground and cannot be in shade.
      if (facade && twilight) {
        let own = facadeCache.get(rgb)
        if (!own) {
          const scale = facadeScale(rgb, streetY, twilight)
          facadeCache.set(rgb, own = [rgb[0] * scale, rgb[1] * scale, rgb[2] * scale])
        }
        rgb = own
      }
      color = [encode(rgb[0] * transmits + red), encode(rgb[1] * transmits + green), encode(rgb[2] * transmits + blue)]
      colors.set(rho, color)
      return color
    }
  }
}
