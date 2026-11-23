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
/** How far round a point its depth in the mass is taken, sky px overhead. */
const DEEP = 26

/** The sun's and the sky's light 0–1, and how deep inside the mass a point is 0–1. */
export interface Lit { sun: Float32Array; sky: Float32Array; deep: Float32Array }

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
  return { sun: up(sunHalf, w, h, f), sky: up(skyHalf, w, h, f), deep: up(depth(small, w, h, f), w, h, f) }
}

/** The thickness round a point, over the deck's own reach: what stands between it and any bright rim. */
function depth(small: Float32Array, w: number, h: number, f: SheetField) {
  const rowReach = (j: number) => Math.max(1, DEEP * f.scale[Math.min(f.h - 1, 2 * j)] * RASTER / 2)
  let a = small
  for (let pass = 0; pass < 2; pass++) {
    const across = new Float32Array(w * h), down = new Float32Array(w * h)
    for (let j = 0; j < h; j++) {
      const r = Math.round(rowReach(j))
      let sum = 0
      for (let i = -r; i <= r; i++) sum += a[j * w + Math.min(w - 1, Math.max(0, i))]
      for (let i = 0; i < w; i++) {
        across[j * w + i] = sum / (2 * r + 1)
        sum += a[j * w + Math.min(w - 1, i + r + 1)] - a[j * w + Math.max(0, i - r)]
      }
    }
    const total = new Float32Array((h + 1) * w)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) total[(j + 1) * w + i] = total[j * w + i] + across[j * w + i]
    for (let j = 0; j < h; j++) {
      const r = Math.round(rowReach(j)), top = Math.max(0, j - r), end = Math.min(h, j + r + 1)
      for (let i = 0; i < w; i++) down[j * w + i] = (total[end * w + i] - total[top * w + i]) / (end - top)
    }
    a = down
  }
  return a
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
