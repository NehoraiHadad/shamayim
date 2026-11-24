/*
 * The light in a cloud (a sheet's raster or a tower's): how much of it reaches each point through the cloud itself. Three
 * marches over a half-size copy of the thickness: toward the light in the picture (the lit side, the bright rim, the mass's
 * own shade), up (the open sky's light on the crowns) and down (the flat base). Steps grow outward and shrink with the
 * cloud's perspective. Two losses: the fine one models the heads, the broad one (light scattered many times) the whole
 * mass, so a tall cloud has a lit side and a shaded one.
 */

/** What is lit: its thickness 0–1 on a raster of `k` px per sky px, its scale by row (1 overhead, small far off). */
export interface LitBody { w: number; h: number; k: number; thick: Float32Array; scale: Float32Array }

/** March steps, sky px overhead, and how many of them look for the base; the light's loss per px of full thickness; the
 *  broad loss against it and the broad light's share. */
const STEPS = [3, 7, 13, 22, 36, 62, 110, 180] as const, TO_BASE = 60
const LOSS_SUN = 0.05, LOSS_SKY = 0.032, BROAD = 0.24, MANY = 0.72
/** How far round a point its depth in the mass is taken, sky px overhead. */
const DEEP = 26

/** The sun's and the sky's light 0–1, how deep inside the mass a point is, and how far it is its base (0–1). */
export interface Lit { sun: Float32Array; sky: Float32Array; deep: Float32Array; base: Float32Array }

const through = (loss: number, depth: number) => (1 - MANY) * Math.exp(-loss * depth) + MANY * Math.exp(-BROAD * loss * depth)

/** `from` the light's place in sky px, the body's corner at (x0, y0). */
export function cloudLight(f: LitBody, from: { x: number; y: number }, x0: number, y0: number): Lit {
  const w = Math.ceil(f.w / 2), h = Math.ceil(f.h / 2), small = halved(f, w, h)
  const at = (x: number, y: number) => {
    const cx = Math.min(w - 1.001, Math.max(0, x)), cy = Math.min(h - 1.001, Math.max(0, y))
    const i = cx | 0, j = cy | 0, tx = cx - i, ty = cy - j, n = j * w + i
    const a = small[n] + (small[n + 1] - small[n]) * tx
    const b = small[n + w] + (small[n + w + 1] - small[n + w]) * tx
    return a + (b - a) * ty
  }
  const k = f.k / 2
  const sunHalf = new Float32Array(w * h), skyHalf = new Float32Array(w * h), baseHalf = new Float32Array(w * h)
  for (let j = 0; j < h; j++) {
    const scale = f.scale[Math.min(f.h - 1, 2 * j)] * k
    for (let i = 0; i < w; i++) {
      const n = j * w + i
      const dx = from.x - (x0 + i / k), dy = from.y - (y0 + j / k), d = Math.hypot(dx, dy) || 1
      const ux = dx / d, uy = dy / d
      let sun = 0, sky = 0, down = 0, last = 0
      for (const s of STEPS) {
        const ds = s - last, l = s * scale
        sun += ds * at(i + ux * l, j + uy * l)
        sky += ds * at(i, j - l)
        if (s < TO_BASE) down += ds * at(i, j + l)
        last = s
      }
      sunHalf[n] = through(LOSS_SUN, sun)
      skyHalf[n] = through(LOSS_SKY, sky)
      baseHalf[n] = Math.exp(-2 * LOSS_SKY * down) * (1 - Math.exp(-LOSS_SKY * sky))
    }
  }
  return { sun: up(sunHalf, w, h, f), sky: up(skyHalf, w, h, f), base: up(baseHalf, w, h, f), deep: up(depth(small, w, h, f), w, h, f) }
}

function halved(f: LitBody, w: number, h: number): Float32Array {
  const small = new Float32Array(w * h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const i0 = Math.min(f.w - 1, 2 * i), j0 = Math.min(f.h - 1, 2 * j), i1 = Math.min(f.w - 1, i0 + 1), j1 = Math.min(f.h - 1, j0 + 1)
      small[j * w + i] = (f.thick[j0 * f.w + i0] + f.thick[j0 * f.w + i1] + f.thick[j1 * f.w + i0] + f.thick[j1 * f.w + i1]) / 4
    }
  }
  return small
}

/** The thickness round a point, over the deck's own reach: what stands between it and any bright rim. */
function depth(small: Float32Array, w: number, h: number, f: LitBody) {
  const rowReach = (j: number) => Math.max(1, DEEP * f.scale[Math.min(f.h - 1, 2 * j)] * f.k / 2)
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
function up(half: Float32Array, w: number, h: number, f: LitBody) {
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
