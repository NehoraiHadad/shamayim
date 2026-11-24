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

/**
 * A colour in two steps. The surface (material and incident light, with the street's contrast on a facade) is the same at every
 * distance and worked out once; the path then adds its air to it, once per distance.
 */
export function exposedColors({ irr, air, streetY }: BuildingSurroundings) {
  const surfaces = new WeakMap<RGB, WeakMap<RGB, RGB>>()
  const facades = new WeakMap<RGB, RGB>()
  const twilight = facadeTwilight(irr.sunAlt)
  return {
    surface(rho: RGB, light: RGB): RGB {
      let materials = surfaces.get(light)
      if (!materials) surfaces.set(light, materials = new WeakMap())
      let rgb = materials.get(rho)
      if (!rgb) materials.set(rho, rgb = expose(rho, light, irr.yHorizon))
      return rgb
    },
    facade(rgb: RGB): RGB {
      if (!twilight) return rgb
      let own = facades.get(rgb)
      if (!own) {
        const scale = facadeScale(rgb, streetY, twilight)
        facades.set(rgb, own = [rgb[0] * scale, rgb[1] * scale, rgb[2] * scale])
      }
      return own
    },
    // The path's scattered light comes from the same air as the ground and cannot be in shade.
    through(haze: number) {
      const shown = new WeakMap<RGB, RGB>()
      const transmits = 1 - haze
      const [red, green, blue] = [air[0] * haze, air[1] * haze, air[2] * haze]
      return (surface: RGB): RGB => {
        let color = shown.get(surface)
        if (!color) {
          color = [encode(surface[0] * transmits + red), encode(surface[1] * transmits + green), encode(surface[2] * transmits + blue)]
          shown.set(surface, color)
        }
        return color
      }
    },
  }
}
