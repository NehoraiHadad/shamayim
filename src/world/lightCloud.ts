import type { Covers } from './clouds'
import { smoothstep } from './ridgeLighting'
import type { CloudField } from './field/types'

const mean = (cover: number, tau: number) => 1 + cover * Math.expm1(-tau / 2)
const openness = (cover: number, transmission: number) => transmission ** smoothstep(0.75, 0.97, cover)

export function cloudLight(covers: Covers, field?: CloudField) {
  let open = 1, meanTransmission = 1
  if (field) {
    for (const layer of field.layers) {
      const t = mean(layer.cover, layer.kappa * layer.meanVKm)
      open *= openness(layer.cover, t)
      meanTransmission *= t
    }
  } else {
    // Cover-only callers use the median Sc, As and Cs reference depths from the genus table.
    for (const [c, tau] of [[covers.low, 16], [covers.mid, 12], [covers.high, 0.875]]) {
      const t = mean(c, tau)
      open *= openness(c, t)
      meanTransmission *= t
    }
  }
  return { open, diffuse: 1 - meanTransmission }
}

export const cloudTransmit = (covers: Covers) => cloudLight(covers).open
