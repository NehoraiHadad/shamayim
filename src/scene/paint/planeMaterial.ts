import type { PlaneTexelCtx } from './planeTexel'
import { TEXEL } from '../model/planeBands'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const ease = (v: number) => v * v * (3 - 2 * v)
const smooth = (lo: number, hi: number, v: number) => ease(clamp((v - lo) / (hi - lo), 0, 1))

function hash(seed: number, x: number, y: number) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1)
  return a + (b - a) * sx + (c - a + (d - c - b + a) * sx) * sy
}

/** Light-independent palette, gouache drift and asymmetric dark flecks. */
export function materialAt(t: PlaneTexelCtx, x: number, y: number, u: number, v: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const { surface, paletteLin, seed, grainAmount } = t
  const pCols = surface.cols, pRows = surface.rows, cells = surface.cells

  const n1 = valueNoise(seed + 17, x * 0.032, y * 0.055), n2 = valueNoise(seed + 31, x * 0.075, y * 0.12)
  const maxC = pCols - 1, maxR = pRows - 1
  const gx = clamp(u * maxC + (n1 * 0.68 + n2 * 0.32 - 0.5) * 1.4, 0, maxC)
  const gy = maxR > 0 ? clamp(v * maxR + (n2 - 0.5) * 0.55 + (n1 - 0.5) * 0.35, 0, maxR) : 0
  const c0 = Math.floor(gx), c1 = Math.min(maxC, c0 + 1), r0 = Math.floor(gy), r1 = Math.min(maxR, r0 + 1)
  // Each ray represents an area. Reconstruct across four neighbouring rays
  // with a cubic B-spline so isolated dark samples do not create stripes.
  const dx = gx - c0, inv = 1 - dx, fy = smooth(0.16, 0.84, gy - r0)
  const cPrev = Math.max(0, c0 - 1), cNext = Math.min(maxC, c1 + 1)
  const wPrev = inv ** 3 / 6, wNext = dx ** 3 / 6
  const w0 = (4 + dx * dx * (3 * dx - 6)) / 6, w1 = 1 - wPrev - w0 - wNext
  const sample = (row: number, col: number) => paletteLin[cells[row * pCols + col]] ?? paletteLin[0]
  const prev0 = sample(r0, cPrev), left0 = sample(r0, c0), right0 = sample(r0, c1), next0 = sample(r0, cNext)
  const prev1 = sample(r1, cPrev), left1 = sample(r1, c0), right1 = sample(r1, c1), next1 = sample(r1, cNext)
  const blend = (i: 0 | 1 | 2) => {
    const upper = prev0[i] * wPrev + left0[i] * w0 + right0[i] * w1 + next0[i] * wNext
    const lower = prev1[i] * wPrev + left1[i] * w0 + right1[i] * w1 + next1[i] * wNext
    return upper + (lower - upper) * fy
  }
  let rr = blend(0), rg = blend(1), rb = blend(2)

  // Material mottle: linear reflectance variation BEFORE lighting so texture stays crisp in sunlit relief.
  if (grainAmount > 0) {
    const coarse = valueNoise(seed, x * 0.055, y * 0.095) - 0.5
    const fine = valueNoise(seed + 7, x * 0.12, y * 0.20)
    const fleck = Math.max(0, (0.62 - fine) / 0.62)
    const f = clamp(1 + (0.95 * coarse + 0.17 - 0.8 * fleck ** 2) * grainAmount, 0.38, 1.42)
    rr = clamp(rr * f, 0, 1); rg = clamp(rg * f, 0, 1); rb = clamp(rb * f, 0, 1)
  }
  // Lying snow enters receiver reflectance BEFORE lighting and haze (Finding 7).
  out[0] = rr; out[1] = rg; out[2] = rb
  return out
}

const materials = new Map<string, Float32Array>()

/** Reuse material texels across changing light, cloud poses and Worker paint chunks. */
export function planeMaterial(t: PlaneTexelCtx, form: string) {
  const { bounds, wPx, hPx, seed, grainAmount, crestY, footY } = t
  const key = `${form}:${bounds.x}:${bounds.y}:${wPx}:${hPx}:${seed}:${grainAmount}`
  const held = materials.get(key)
  if (held) return held
  const material = new Float32Array(wPx * hPx * 3)
  const rgb: [number, number, number] = [0, 0, 0]
  for (let j = 0; j < hPx; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < wPx; i++) {
      const offset = (i + 0.5) * TEXEL
      const u = clamp(offset / Math.max(1, bounds.w), 0, 1)
      const v = clamp((y - crestY[i]) / Math.max(1, footY[i] - crestY[i]), 0, 1)
      material.set(materialAt(t, bounds.x + offset, y, u, v, rgb), (j * wPx + i) * 3)
    }
  }
  if (materials.size >= 8) materials.delete(materials.keys().next().value!)
  materials.set(key, material)
  return material
}
