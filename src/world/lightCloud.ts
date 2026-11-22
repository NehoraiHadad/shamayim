import type { Covers } from './clouds'
import { smoothstep } from './ridgeLighting'
import type { CloudField } from './field/types'

export const layerMeanTransmission = (cover: number, tau: number) => 1 + cover * Math.expm1(-tau)
const openness = (cover: number, transmission: number) => transmission ** smoothstep(0.75, 0.97, cover)

export function cloudLight(covers: Covers, field?: CloudField) {
  let gap = 1, meanTransmission = 1
  if (field) {
    for (const layer of field.layers) {
      const t = layerMeanTransmission(layer.cover, layer.kappa * layer.meanVKm)
      gap *= 1 - layer.cover
      meanTransmission *= t
    }
  } else {
    // Cover-only callers use the median Sc, As and Cs reference depths from the genus table.
    for (const [c, tau] of [[covers.low, 16], [covers.mid, 12], [covers.high, 0.875]]) {
      const t = layerMeanTransmission(c, tau)
      gap *= 1 - c
      meanTransmission *= t
    }
  }
  return { open: openness(1 - gap, meanTransmission), clear: meanTransmission, diffuse: 1 - meanTransmission }
}

export const cloudTransmit = (covers: Covers) => cloudLight(covers).open
