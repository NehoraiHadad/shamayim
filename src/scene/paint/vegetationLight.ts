import { albedoLinear, linearRgbToSrgb, shadeLinearRgb } from '../model/landRadiance'
import type { Box, PlaneLitField, Pt, RGB } from '../model/types'
import { outlineBandY, TEXEL } from './landSurface'
import { samplePlaneField } from './planeTexel'

export type VegetationToneAt = (i: number, x: number, y: number) => RGB

/** Ground-aligned patches use their centre; upright plants sample at their stationary root. */
export function vegetationLight(
  tones: readonly RGB[], field: PlaneLitField, outline: readonly Pt[], bounds: Box, pass?: (x: number, y: number) => number,
): VegetationToneAt {
  const palette = tones.map((rgb) => albedoLinear(rgb, 1))
  const cols = Math.max(1, Math.ceil(bounds.w / TEXEL))
  const { crestY, footY } = outlineBandY(outline, bounds, cols)
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  return (i, x, y) => {
    const u = clamp01((x - bounds.x) / bounds.w)
    const c = Math.min(cols - 1, Math.floor(u * cols))
    const v = clamp01((y - crestY[c]) / Math.max(1, footY[c] - crestY[c]))
    const { sVis, mVis, vSky, haze } = samplePlaneField(field, u, v)
    return linearRgbToSrgb(shadeLinearRgb(palette[i] ?? palette[0], field.eSun, field.eMoon, field.eSky,
      sVis * (pass?.(x, y) ?? 1), mVis, vSky, field.yHorizon, haze, field.hazeLin))
  }
}
