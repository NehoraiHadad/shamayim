import type { SheetField } from './sheetField'
import { RASTER } from './sheetField'

/*
 * The light in a sheet: how much of it reaches each point of the raster through the cloud itself. Two short marches over
 * a half-size copy of the thickness: toward the light in the picture (the lit side, the bright rim, the mass's own shade) and
 * up (the open sky's light on the crowns). Steps grow outward and shrink with the deck's perspective.
 */

/** March steps, sky px overhead, and the light's loss per px of full thickness. */
const STEPS = [3, 7, 13, 22, 34] as const
const LOSS_SUN = 0.05, LOSS_SKY = 0.032

export interface Lit { sun: Float32Array; sky: Float32Array }

/** `from` the light's place in sky px, the sheet's corner at (x0, y0). */
export function sheetLight(f: SheetField, from: { x: number; y: number }, x0: number, y0: number): Lit {
  const w = Math.ceil(f.w / 2), h = Math.ceil(f.h / 2)
  const small = new Float32Array(w * h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const i0 = Math.min(f.w - 1, 2 * i), j0 = Math.min(f.h - 1, 2 * j), i1 = Math.min(f.w - 1, i0 + 1), j1 = Math.min(f.h - 1, j0 + 1)
      small[j * w + i] = (f.thick[j0 * f.w + i0] + f.thick[j0 * f.w + i1] + f.thick[j1 * f.w + i0] + f.thick[j1 * f.w + i1]) / 4
    }
  }
  const at = (x: number, y: number) => {
    const cx = Math.min(w - 1.001, Math.max(0, x)), cy = Math.min(h - 1.001, Math.max(0, y))
    const i = cx | 0, j = cy | 0, tx = cx - i, ty = cy - j, n = j * w + i
    const a = small[n] + (small[n + 1] - small[n]) * tx
    const b = small[n + w] + (small[n + w + 1] - small[n + w]) * tx
    return a + (b - a) * ty
  }
  const k = RASTER / 2
  const sunHalf = new Float32Array(w * h), skyHalf = new Float32Array(w * h)
  for (let j = 0; j < h; j++) {
    const scale = f.scale[Math.min(f.h - 1, 2 * j)] * k
    for (let i = 0; i < w; i++) {
      const n = j * w + i
      const dx = from.x - (x0 + i / k), dy = from.y - (y0 + j / k), d = Math.hypot(dx, dy) || 1
      const ux = dx / d, uy = dy / d
      let sun = 0, sky = 0, last = 0
      for (const s of STEPS) {
        const ds = s - last, l = s * scale
        sun += ds * at(i + ux * l, j + uy * l)
        sky += ds * at(i, j - l)
        last = s
      }
      sunHalf[n] = Math.exp(-LOSS_SUN * sun)
      skyHalf[n] = Math.exp(-LOSS_SKY * sky)
    }
  }
  return { sun: up(sunHalf, w, h, f), sky: up(skyHalf, w, h, f) }
}

/** A half-size grid on the field's raster, bilinear. */
function up(half: Float32Array, w: number, h: number, f: SheetField) {
  const out = new Float32Array(f.w * f.h)
  for (let j = 0; j < f.h; j++) {
    const y = Math.max(0, Math.min(h - 1.001, j / 2 - 0.25)), r = y | 0, ty = y - r
    for (let i = 0; i < f.w; i++) {
      const x = Math.max(0, Math.min(w - 1.001, i / 2 - 0.25)), c = x | 0, tx = x - c, n = r * w + c
      const a = half[n] + (half[n + 1] - half[n]) * tx
      out[j * f.w + i] = a + (half[n + w] + (half[n + w + 1] - half[n + w]) * tx - a) * ty
    }
  }
  return out
}
