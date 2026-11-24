import { TEXEL } from '../../../model/planeBands'
import { linearLuminance } from '../../../model/landRadiance'
import type { LayerOf } from '../../../model/types'
import { fractal } from '../../shared/base/core'
import { materialAt, mottle } from '../../shared/land/planeMaterial'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import { foldsOf } from './folds'

/*
 * The ground's own surface, seen at a slant: the model's palette where it lies, broken into patches of soil and scrub that
 * lengthen across the slope and shrink toward the crest, its fine grain, and the small form the light rakes over. No light in it.
 */

/** A texel's reflectance (3 each), then its fall across, its fall away from the eye and its open sky (3 each). */
export interface GroundForm { rho: Float32Array; form: Float32Array }

/** How flat the slant makes a patch; how far it follows the crest's line, eased over this many texels; how far the palette's columns are bent (px). */
const FLAT = 2.4, FOLLOW = 0.35, EASED = 10, BENT = 24
/** The sizes across (px): broad, middle, fine; what each weighs at the crest and at the foot. */
const BROAD = { px: 110, crest: 0.25, foot: 1 }, MIDDLE = { px: 44, crest: 0.6, foot: 0.9 }, FINE = { px: 14, crest: 1, foot: 0.85 }
/** How far the patches move the reflectance; a clump's size (px) and darkening; the swells' heights (px); a fold's depth and dark bed. */
const PATCHES = 0.5, CLUMP = 24, SCRUB = 0.44, SWELL = [13, 8, 4] as const, DEEP = 3, BED = 0.18
/** What the far planes show of it; the mottle's strength, the patches' own fine part beside it; its lift of the mean, kept; the sky a px of depth takes. */
const PLAIN = 0.45, GRAIN = 0.9, KEPT = 0.05, OPEN = 0.02

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (lo: number, hi: number, v: number) => { const x = clamp01((v - lo) / (hi - lo)); return x * x * (3 - 2 * x) }

const forms = new Map<string, GroundForm>()

/** The ground of a plane, kept while the light on it changes. */
export function groundFormOf(t: PlaneTexelCtx, desc: LayerOf<'plane'>): GroundForm {
  const { x, y } = t.bounds, key = `${desc.key}:${x}:${y}:${t.wPx}:${t.hPx}:${t.seed}:${t.grainAmount}`
  let held = forms.get(key)
  if (!held) {
    if (forms.size >= 8) forms.delete(forms.keys().next().value!)
    forms.set(key, held = made(t, desc))
  }
  return held
}

function made(t: PlaneTexelCtx, desc: LayerOf<'plane'>): GroundForm {
  const { wPx: cols, hPx: rows, bounds, crestY, footY, seed } = t, cells = cols * rows
  const rho = new Float32Array(cells * 3), height = new Float32Array(cells), folds = foldsOf(t, desc)
  const plain: PlaneTexelCtx = { ...t, grainAmount: 0 }, base: [number, number, number] = [0, 0, 0]
  const rough = Math.min(1, PLAIN + t.grainAmount), line = eased(crestY)
  let was = 0, is = 0
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const off = (i + 0.5) * TEXEL, y = bounds.y + (j + 0.5) * TEXEL
    // Beyond the plane's own edge only what its smoothing reads.
    if (y < crestY[i] - 3 * TEXEL || y > footY[i] + 3 * TEXEL) continue
    const v = clamp01((y - crestY[i]) / Math.max(1, footY[i] - crestY[i])), near = v * v * (3 - 2 * v)
    const down = (y - bounds.y - FOLLOW * (1 - v) * line[i]) * FLAT
    const bend = fractal(seed + 5, off, down, 0.006, 0.006, 1) - 0.5
    const read = (k: number, px: number) => 2 * fractal(seed + k, off + 2 * BENT * bend, down + 2 * BENT * bend, 1 / px, 1 / px, 1) - 1
    const weigh = (s: typeof BROAD) => s.crest + (s.foot - s.crest) * near
    const b = weigh(BROAD), m = weigh(MIDDLE), f = weigh(FINE), broad = read(11, BROAD.px), middle = read(12, MIDDLE.px), fine = read(13, FINE.px)
    materialAt(plain, bounds.x + off, y, clamp01((off + 2 * BENT * bend) / Math.max(1, bounds.w)), v, base)
    const patch = b * broad + 0.8 * m * middle + 0.6 * f * fine
    // Scrub stands where the model's ground is green.
    const green = smooth(-0.18, 0.12, (base[1] - base[0]) / Math.max(1e-4, base[1] + base[0]))
    const scrub = rough * (0.2 + 0.8 * green) * smooth(0.02, 0.5, read(14, CLUMP) + 0.45 * fine - 0.25 * patch)
    const shift = rough * PATCHES * patch, dark = (1 + shift) * (1 - SCRUB * scrub) * (1 - BED * folds[n]), o = n * 3
    const grain = dark * (t.grainAmount ? mottle(seed, bounds.x + off, y, GRAIN * t.grainAmount) : 1)
    height[n] = rough * (b * SWELL[0] * broad + m * SWELL[1] * middle + f * SWELL[2] * fine + 2 * scrub) - DEEP * folds[n]
    rho[o] = clamp01(base[0] * grain * (1 + 0.14 * shift - 0.1 * scrub))
    rho[o + 1] = clamp01(base[1] * grain * (1 + 0.04 * scrub))
    rho[o + 2] = clamp01(base[2] * grain * (1 - 0.2 * shift))
    was += linearLuminance(base)
    is += 0.2126 * rho[o] + 0.7152 * rho[o + 1] + 0.0722 * rho[o + 2]
  }
  const even = is > 0 ? (was / is) * (1 + KEPT * t.grainAmount) : 1
  for (let k = 0; k < rho.length; k++) rho[k] = Math.min(1, rho[k] * even)
  return { rho, form: formOf(height, t) }
}

/** The form's slopes and open sky about their own means: the ground's whole tilt is in the light's field. */
function formOf(height: Float32Array, { wPx: cols, hPx: rows, bounds, crestY, footY }: PlaneTexelCtx): Float32Array {
  const form = new Float32Array(height.length * 3), sum = [0, 0, 0]
  let seen = 0
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const left = height[i ? n - 1 : n], right = height[i < cols - 1 ? n + 1 : n]
    const above = height[j ? n - cols : n], below = height[j < rows - 1 ? n + cols : n], y = bounds.y + (j + 0.5) * TEXEL
    form[n * 3] = (left - right) / (2 * TEXEL)
    form[n * 3 + 1] = (below - above) / (2 * TEXEL * FLAT)
    form[n * 3 + 2] = OPEN * height[n]
    if (y < crestY[i] || y > footY[i]) continue
    seen++
    for (let c = 0; c < 3; c++) sum[c] += form[n * 3 + c]
  }
  for (let o = 0; seen && o < form.length; o += 3) {
    form[o] -= sum[0] / seen
    form[o + 1] -= sum[1] / seen
    form[o + 2] = Math.min(1.15, Math.max(0.8, 1 + form[o + 2] - sum[2] / seen))
  }
  return form
}

/** The crest's line about its own mean, its steps eased. */
function eased(crest: Float32Array): Float32Array {
  const n = crest.length, mean = crest.reduce((sum, y) => sum + y, 0) / n
  return Float32Array.from(crest, (_, i) => {
    let sum = 0
    for (let k = -EASED; k <= EASED; k++) sum += crest[Math.min(n - 1, Math.max(0, i + k))]
    return sum / (2 * EASED + 1) - mean
  })
}
