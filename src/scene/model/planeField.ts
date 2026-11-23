//# allFunctionsCalledOnLoad
import { outlineBandY, TEXEL } from './planeBands'
import type { Box, PlaneLitField, Pt, RGB } from './types'

const NO_BEAM: RGB = [0, 0, 0]
export const shadowBeam = (field: PlaneLitField) => field.cloudDiffuse ?? NO_BEAM

export interface FieldSample { sVis: number; mVis: number; vSky: number; haze: number }
export const fieldSample = (): FieldSample => ({ sVis: 0, mVis: 0, vSky: 0, haze: 0 })

function interpolate(g: Uint8Array, a: number, b: number, c: number, d: number, tx: number, ty: number) {
  const lo = g[a] + (g[b] - g[a]) * tx
  const hi = g[c] + (g[d] - g[c]) * tx
  return (lo + (hi - lo) * ty) / 255
}

export function samplePlaneField({ cols, rows, grid }: PlaneLitField, u: number, v: number, out: FieldSample) {
  const x = u * (cols - 1), y = v * (rows - 1)
  const c = Math.floor(x), r = Math.floor(y)
  const dx = c + 1 < cols ? 4 : 0, dy = r + 1 < rows ? cols * 4 : 0
  const a = (r * cols + c) * 4, b = a + dx, d = a + dy, e = d + dx
  const tx = x - c, ty = y - r
  out.sVis = interpolate(grid, a, b, d, e, tx, ty)
  out.mVis = interpolate(grid, a + 1, b + 1, d + 1, e + 1, tx, ty)
  out.vSky = interpolate(grid, a + 2, b + 2, d + 2, e + 2, tx, ty)
  out.haze = interpolate(grid, a + 3, b + 3, d + 3, e + 3, tx, ty)
}

const bands = new WeakMap<readonly Pt[], { bounds: Box; data: ReturnType<typeof outlineBandY> }>()
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Sample the light at a stationary vegetation root or ground patch centre. */
export function vegetationField(field: PlaneLitField, outline: readonly Pt[], bounds: Box) {
  const cols = Math.max(1, Math.ceil(bounds.w / TEXEL))
  let held = bands.get(outline)
  if (held?.bounds !== bounds) bands.set(outline, held = { bounds, data: outlineBandY(outline, bounds, cols) })
  const { crestY, footY } = held.data
  return (x: number, y: number, out: FieldSample) => {
    const u = clamp01((x - bounds.x) / bounds.w)
    const c = Math.min(cols - 1, Math.floor(u * cols))
    const v = clamp01((y - crestY[c]) / Math.max(1, footY[c] - crestY[c]))
    samplePlaneField(field, u, v, out)
  }
}
