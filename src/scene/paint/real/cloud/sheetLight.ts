import { cloudLight } from './light'
import { RASTER, type SheetField } from './sheetField'
import type { CloudPoint } from './tone'

/** Nearer than this (px) to the light's own place it comes from behind a cloud, not from a side. */
const BEFORE = 70

/** The mean of each four cells of a w × h grid, on the half-size grid the light is worked out on. */
function halved(full: Float32Array, w: number, h: number, hw: number, hh: number): Float32Array {
  const half = new Float32Array(hw * hh)
  for (let j = 0; j < hh; j++) {
    const j0 = Math.min(h - 1, 2 * j) * w, j1 = Math.min(h - 1, 2 * j + 1) * w
    for (let i = 0; i < hw; i++) {
      const i0 = Math.min(w - 1, 2 * i), i1 = Math.min(w - 1, 2 * i + 1)
      half[j * hw + i] = (full[j0 + i0] + full[j0 + i1] + full[j1 + i0] + full[j1 + i1]) / 4
    }
  }
  return half
}

/** Writes the light on a sheet's pixel into a point. Worked out at half the raster's size. `from`: the light's place, raster px. */
export function sheetLight(field: SheetField, from: { x: number; y: number }, beam: number) {
  const { w, h } = field, hw = Math.ceil(w / 2), hh = Math.ceil(h / 2)
  const thick = halved(field.thick, w, h, hw, hh), scale = Float32Array.from({ length: hh }, (_, j) => field.scale[Math.min(h - 1, 2 * j)])
  const { light, shade } = cloudLight({ w: hw, h: hh, k: RASTER / 2, thick, scale }, { x: from.x / 2, y: from.y / 2 }, beam)
  const relief = reliefOf(field, thick, hw, hh, from)
  return (i: number, j: number, p: number, point: CloudPoint) => {
    const x = Math.min(hw - 1.001, Math.max(0, i / 2 - 0.25)), y = Math.min(hh - 1.001, Math.max(0, j / 2 - 0.25))
    const c = x | 0, r = y | 0, tx = x - c, ty = y - r, n = r * hw + c, m = n + hw
    const at = (g: Float32Array) => {
      const top = g[n] + (g[n + 1] - g[n]) * tx
      return top + (g[m] + (g[m + 1] - g[m]) * tx - top) * ty
    }
    point.light = at(light)
    point.shade = at(shade)
    point.relief = at(relief)
    point.thick = field.thick[p]
    point.wall = field.wall[p]
    point.flat = field.flat[p]
  }
}

/** How far the heads face away from the light, on the half-size grid. */
function reliefOf({ w, bend, scale, grain }: SheetField, thick: Float32Array, hw: number, hh: number, from: { x: number; y: number }): Float32Array {
  const out = new Float32Array(hw * hh), middle = (w - 1) / 2, before = BEFORE * RASTER
  for (let j = 0, n = 0; j < hh; j++) {
    const row = Math.min(scale.length - 1, 2 * j)
    grain.row(scale[row])
    for (let i = 0; i < hw; i++, n++) {
      if (!thick[n]) continue
      const x = Math.min(w - 1, 2 * i), dx = from.x - x, dy = from.y - row, far = Math.max(before, Math.sqrt(dx * dx + dy * dy))
      out[n] = grain.relief((x - middle) / RASTER, row / RASTER, dx / far, dy / far, bend[row * w + x])
    }
  }
  return out
}
