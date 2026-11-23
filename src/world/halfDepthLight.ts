import { lightOf, type LightInput } from './light'
import type { Light } from './types'

const inputs = new WeakMap<Light, LightInput>()
const halved = new WeakMap<Light, Light>()

export function rememberLightInput(light: Light, input: LightInput): void {
  inputs.set(light, input)
}

/** The light through half the clouds' optical depth: the illustrated palette (`illustratedTones.ts`), the sky's dust grains and the optics of rain. */
export function halfDepthLightOf(light: Light): Light {
  const input = inputs.get(light)
  if (!input) return light
  let value = halved.get(light)
  if (!value) {
    value = lightOf(input, .5)
    halved.set(light, value)
  }
  return value
}
