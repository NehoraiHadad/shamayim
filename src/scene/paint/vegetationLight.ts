import { albedoLinear, linearRgbToSrgb, shadeLinearRgb } from '../model/landRadiance'
import { fieldSample, vegetationField } from '../model/planeField'
import type { Box, PlaneLitField, Pt, RGB } from '../model/types'

export type VegetationToneAt = (i: number, x: number, y: number) => RGB

export function vegetationLight(
  tones: readonly RGB[], field: PlaneLitField, outline: readonly Pt[], bounds: Box, beam: number,
): VegetationToneAt {
  const palette = tones.map((rgb) => albedoLinear(rgb, 1))
  const sample = vegetationField(field, outline, bounds)
  const light = fieldSample()
  return (i, x, y) => {
    sample(x, y, light)
    return linearRgbToSrgb(shadeLinearRgb(palette[i] ?? palette[0], field.eSun, field.eMoon, field.eSky,
      light.sVis * beam, light.mVis, light.vSky, field.yHorizon, light.haze, field.hazeLin))
  }
}
