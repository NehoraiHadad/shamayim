import { albedoLinear, linearRgbToSrgb, shadeLinearRgb } from '../model/landRadiance'
import { fieldSample, vegetationField } from '../model/planeField'
import type { Box, PlaneLitField, Pt, RGB } from '../model/types'
import type { ReceiverInk } from './receiverBrush'

export type VegetationToneAt = (i: number, x: number, y: number) => ReceiverInk

export function vegetationLight(
  tones: readonly RGB[], field: PlaneLitField, outline: readonly Pt[], bounds: Box, paired: boolean,
): VegetationToneAt {
  const palette = tones.map((rgb) => albedoLinear(rgb, 1))
  const sample = vegetationField(field, outline, bounds)
  const light = fieldSample()
  return (i, x, y) => {
    sample(x, y, light)
    const tone = (beam: number) => linearRgbToSrgb(shadeLinearRgb(palette[i] ?? palette[0], field.eSun, field.eMoon, field.eSky,
      beam, light.mVis, light.vSky, field.yHorizon, light.haze, field.hazeLin))
    const lit = tone(light.sVis)
    return [lit, paired && light.sVis ? tone(0) : undefined]
  }
}
