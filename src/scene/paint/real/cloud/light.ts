/*
 * The light in a cloud: how much of it reaches each point through the cloud itself. Three marches over a half-size copy of
 * its thickness: toward the light in the picture (the lit side, the bright rim, the mass's own shade), up (the open sky's
 * light on the crowns) and down (the flat base). Steps grow outward and shrink with the cloud's perspective. Two losses:
 * the fine one models the heads, the broad one (light scattered many times) the whole mass.
 */

/** What is lit: its thickness 0–1 on a grid of `k` cells per sky px, its scale by row (1 overhead, small far off). */
export interface LitBody { w: number; h: number; k: number; thick: Float32Array; scale: Float32Array }

/** The light that reaches each cell (0–1), and how far toward the model's shade the cell's own shade takes it. */
export interface CloudLight { light: Float32Array; shade: Float32Array }

/** A tower's foot: by row, what of the sky's light comes down to it, and how far it is the base (0–1). */
export interface Foot { sky: Float32Array; base: Float32Array }

/** March steps, sky px overhead, and how many of them look for the base; the light's loss per px of full thickness; the
 *  broad loss against it and the broad light's share. */
const STEPS = [4, 10, 20, 36, 64, 110, 180] as const, TO_BASE = 4
const LOSS_SUN = 0.05, LOSS_SKY = 0.032, BROAD = 0.24, MANY = 0.72
/** The share of the direct light in the light on a point at its full strength (the rest the open sky's, from above). */
const FROM_SUN = 0.68
/** How far a point's own shade and the flat base take it toward the shade, and a full light toward the lit. */
const OWN_SHADE = 0.7, BASE = 0.42, LIT = 0.2
/** A broad thick mass is all shade by this measure, and the model's tone says how dark it is already: how far its mean goes to
 *  the model's. */
const TO_MEAN = 0.9
/** How far round a point its depth in the mass is taken, sky px overhead. */
const DEEP = 26

const through = (loss: number, depth: number) => (1 - MANY) * Math.exp(-loss * depth) + MANY * Math.exp(-BROAD * loss * depth)

/** `from`: the light's place, in cells of the grid. `beam`: how much of it is direct, 0–1. `mean`: the model's own mean shade. */
export function cloudLight(body: LitBody, from: { x: number; y: number }, beam: number, mean: number, foot?: Foot): CloudLight {
  const { w, h, k, thick, scale } = body, size = w * h, direct = FROM_SUN * beam, deep = depth(body)
  const light = new Float32Array(size), shade = new Float32Array(size)
  let all = 0, mass = 0
  const at = (x: number, y: number) => gridAt(thick, w, h, x, y)
  for (let j = 0, n = 0; j < h; j++) {
    const unit = scale[j] * k
    for (let i = 0; i < w; i++, n++) {
      const dx = from.x - i, dy = from.y - j, far = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / far, uy = dy / far
      let sun = 0, sky = 0, down = 0, last = 0
      for (let s = 0; s < STEPS.length; s++) {
        const step = STEPS[s] - last, reach = STEPS[s] * unit
        sun += step * at(i + ux * reach, j + uy * reach)
        sky += step * at(i, j - reach)
        if (s < TO_BASE) down += step * at(i, j + reach)
        last = STEPS[s]
      }
      const under = Math.exp(-2 * LOSS_SKY * down) * (1 - Math.exp(-LOSS_SKY * sky)), base = foot ? Math.max(under, foot.base[j]) : under
      const here = light[n] = direct * through(LOSS_SUN, sun) + (1 - direct) * through(LOSS_SKY, sky) * (foot ? foot.sky[j] : 1)
      shade[n] = OWN_SHADE * (1 - here) ** 1.25 * (0.45 + 0.55 * deep[n]) + BASE * base * (0.4 + 0.6 * deep[n]) - LIT * here
      all += shade[n] * thick[n]
      mass += thick[n]
    }
  }
  const over = mass ? TO_MEAN * (all / mass - mean) : 0
  for (let n = 0; n < size; n++) shade[n] -= over
  return { light, shade }
}

/** The thickness round a point, over the cloud's own reach: what stands between it and any bright rim. */
function depth({ w, h, k, thick, scale }: LitBody): Float32Array {
  const across = new Float32Array(w * h), total = new Float32Array((h + 1) * w), out = new Float32Array(w * h)
  const reach = (j: number) => Math.max(1, Math.round(DEEP * scale[j] * k))
  for (let j = 0; j < h; j++) {
    const r = reach(j), row = j * w
    let sum = 0
    for (let i = -r; i <= r; i++) sum += thick[row + Math.min(w - 1, Math.max(0, i))]
    for (let i = 0; i < w; i++) {
      across[row + i] = sum / (2 * r + 1)
      sum += thick[row + Math.min(w - 1, i + r + 1)] - thick[row + Math.max(0, i - r)]
    }
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) total[(j + 1) * w + i] = total[j * w + i] + across[j * w + i]
  for (let j = 0; j < h; j++) {
    const r = reach(j), top = Math.max(0, j - r), end = Math.min(h, j + r + 1)
    for (let i = 0; i < w; i++) out[j * w + i] = (total[end * w + i] - total[top * w + i]) / (end - top)
  }
  return out
}

/** A grid's value at (x, y) in its cells, held at its edges. */
export function gridAt(grid: Float32Array, w: number, h: number, x: number, y: number): number {
  const cx = x < 0 ? 0 : x > w - 1.001 ? w - 1.001 : x, cy = y < 0 ? 0 : y > h - 1.001 ? h - 1.001 : y
  const i = cx | 0, j = cy | 0, tx = cx - i, n = j * w + i
  const a = grid[n] + (grid[n + 1] - grid[n]) * tx
  return a + (grid[n + w] + (grid[n + w + 1] - grid[n + w]) * tx - a) * (cy - j)
}
