import { albedoLinear, linearRgbToSrgb, shadeLinearRgb } from '../model/landRadiance'
import { fieldSample, shadowBeam, vegetationField } from '../model/planeField'
import type { Box, PlaneLitField, Pt, RGB } from '../model/types'
import type { ReceiverInk } from './receiverBrush'

export type VegetationToneAt = (i: number, x: number, y: number) => ReceiverInk

export function vegetationLight(
  tones: readonly RGB[], field: PlaneLitField, outline: readonly Pt[], bounds: Box, paired: boolean,
): VegetationToneAt {
  const palette = tones.map((rgb) => albedoLinear(rgb, 1))
  const sample = vegetationField(field, outline, bounds)
  const light = fieldSample()
  const diffuse = shadowBeam(field)
  return (i, x, y) => {
    sample(x, y, light)
    const tone = (beam: RGB) => linearRgbToSrgb(shadeLinearRgb(palette[i] ?? palette[0], beam, field.eMoon, field.eSky,
      light.sVis, light.mVis, light.vSky, field.yHorizon, light.haze, field.hazeLin))
    const lit = tone(field.eSun)
    return [lit, paired && light.sVis ? tone(diffuse) : undefined]
  }
}
