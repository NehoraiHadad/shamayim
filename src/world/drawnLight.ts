import { lightOf, type LightInput } from './light'
import type { Light } from './types'

const inputs = new WeakMap<Light, LightInput>()
const drawn = new WeakMap<Light, Light>()

export function rememberLightInput(light: Light, input: LightInput): void {
  inputs.set(light, input)
}

/** Use the original half-depth cloud transmission for the drawn town's palettes, geometry light and cast shadows. */
export function drawnLightOf(light: Light): Light {
  const input = inputs.get(light)
  if (!input) return light
  let value = drawn.get(light)
  if (!value) {
    value = lightOf(input, .5)
    drawn.set(light, value)
  }
  return value
}
