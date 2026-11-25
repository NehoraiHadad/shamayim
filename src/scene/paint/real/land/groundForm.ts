import type { LayerOf } from '../../../model/types'
import { fractal } from '../../shared/base/core'
import { materialAt } from '../../shared/land/planeMaterial'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import { foldsOf } from './folds'

/*
 * The ground's own surface, seen at a slant: the model's palette where it lies, laid as the hills of the land are: pale
 * limestone breaking through, red soil, dry grass and dark scrub, each in marks that are larger near the eye and finer
 * toward the crest (the octaves weighed by depth, so no mark is stretched), its fine grain, and the small form the light
 * rakes over. No light in it.
 */

/** A texel's reflectance (3 each), then its fall across, its fall away from the eye and its open sky (3 each). */
export interface GroundForm { rho: Float32Array; form: Float32Array }

/** How flat the slant makes a mark; how far it follows the crest's line, eased over this many px; how far the marks are bent (px). */
const FLAT = 2.4, FOLLOW = 0.7, EASED = 30, BENT = 18
/** The marks' octaves (px across). */
const OCTAVES = [3, 6, 12, 24, 48, 96] as const
/** The depths the octaves' weights are kept for; the least weight an octave is read at. */
const LEVELS = 48, FAINT = 0.1
const TURNS = OCTAVES.map((_, o) => [Math.cos(0.9 + 1.7 * o), Math.sin(0.9 + 1.7 * o)] as const)
/** The size (px) a plane's marks centre on at its crest and at its foot. */
const DEPTH: Record<LayerOf<'plane'>['plane'], readonly [number, number]> = { back: [2.6, 4], far: [4, 8], near: [7, 20] }
/** Each field's size of the depth's: the soil and grass, the rock, the scrub. */
const LAYOUT = 3, ROCK = 0.75, SCRUB = 0.55
/** How far the limestone runs along the slope's contours (its ledges); the dark under a ledge, how far down (of the rock's size). */
const LEDGE = 1.6, UNDER = 0.22, BELOW = 0.35
/** The size (px) of the drifts that gather rock in one place and leave bare rests in another. */
const DRIFT = 150
/** How much of the ground each takes: rock (more where the land is dry), scrub (by the model's green), how hard their edges. */
const ROCKY = [0.06, 0.14] as const, SCRUBBY = [0.03, 0.3] as const, EDGE = 0.24
/** The tints (linear, of the ground's own): red soil, dry grass, scrub where green and where dry; limestone and its share. */
const SOIL = [1.06, 0.96, 0.88], GRASS = [1.08, 1.07, 0.88], SCRUBS = [0.5, 0.6, 0.42], STONES = [0.66, 0.62, 0.56]
const LIME = [0.5, 0.47, 0.4], LIMED = 0.45
/** The broad calm swell of the whole; the grain's strength; the warmth given to a grey palette. */
const BROAD = 0.1, GRAIN = 0.07, WARM = 0.07
/** The swells' heights (px at the foot's size): layout, rock, scrub; a fold's depth and dark bed. */
const SWELL = 3.2, LIFT = 1.6, BUSH = 1.4, DEEP = 4, BED = 0.3
/** The sky a px of height takes. */
const OPEN = 0.02
/** How far a hill's side, read from the crest above it, turns the ground, over this reach (px) of the crest. */
const HILL = 0.6, HILL_PX = 16

/** How much of its marks a ground keeps at a depth (its size of the foot's). */
const calm0 = (k: number) => 0.4 + 0.6 * Math.min(1, k)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (lo: number, hi: number, v: number) => { const x = clamp01((v - lo) / (hi - lo)); return x * x * (3 - 2 * x) }

const forms = new Map<string, GroundForm>()

/** The ground of a plane, kept while the light on it changes. */
export function groundFormOf(t: PlaneTexelCtx, desc: LayerOf<'plane'>): GroundForm {
  const { x, y } = t.bounds, key = `${desc.key}:${desc.plane}:${x}:${y}:${t.wPx}:${t.hPx}:${t.texel}:${t.seed}:${t.grainAmount}`
  let held = forms.get(key)
  if (!held) {
    if (forms.size >= 8) forms.delete(forms.keys().next().value!)
    forms.set(key, held = made(t, desc))
  }
  return held
}

/** Octave weights for marks centred on size `c` (px) in a raster of `texel` px: a falling tail below, little above. */
function weights(c: number, texel: number, into: Float32Array): void {
  let sum = 0
  OCTAVES.forEach((s, k) => {
    const d = Math.log2(s / c), fine = smooth(texel, 2.2 * texel, s)
    const w = (d <= 0 ? Math.pow(2, 0.7 * d) : Math.exp(-1.6 * d * d)) * fine
    into[k] = w
    sum += w * w
  })
  const norm = 1 / Math.sqrt(Math.max(1e-6, sum))
  for (let k = 0; k < into.length; k++) into[k] *= norm
}

function made(t: PlaneTexelCtx, desc: LayerOf<'plane'>): GroundForm {
  const { wPx: cols, hPx: rows, bounds, crestY, footY, seed, texel } = t, cells = cols * rows
  const plain: PlaneTexelCtx = { ...t, grainAmount: 0 }, base: [number, number, number] = [0, 0, 0]
  const folds = foldsOf(t, desc), line = eased(crestY, Math.round(EASED / texel)), [c0, c1] = DEPTH[desc.plane], rough = desc.plane === 'back' ? 0.6 : 1
  const baseOf = new Float32Array(cells * 3), size = new Float32Array(cells), inside = new Uint8Array(cells)
  const layout = new Float32Array(cells), rock = new Float32Array(cells), scrub = new Float32Array(cells), grain = new Float32Array(cells)
  const broad = new Float32Array(cells), green = new Float32Array(cells), drift = new Float32Array(cells)
  // The octaves' weights at each depth, ready: the soil and grass, the rock, the scrub.
  const table = (of: number) => Array.from({ length: LEVELS }, (_, l) => {
    const w = new Float32Array(OCTAVES.length)
    weights((c0 + (c1 - c0) * l / (LEVELS - 1)) * of, texel, w)
    return w
  })
  const wL = table(LAYOUT), wR = table(ROCK), wS = table(SCRUB)
  // Each field a sum of the octaves weighed by depth, so a mark shrinks with distance without being stretched.
  // Each octave turned its own way, so no mark lines up with the raster.
  const field = (k: number, x: number, y: number, w: Float32Array) => {
    let sum = 0
    for (let o = 0; o < OCTAVES.length; o++) {
      if (w[o] < FAINT) continue
      const [cos, sin] = TURNS[o], f = 1 / OCTAVES[o]
      sum += w[o] * (2 * fractal(seed + k + 7 * o, x * cos - y * sin, x * sin + y * cos, f, f, 1) - 1)
    }
    return sum
  }
  let dry = 0, seen = 0
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const off = (i + 0.5) * texel, y = bounds.y + (j + 0.5) * texel
    // Beyond the plane's own edge only what its smoothing reads.
    if (y < crestY[i] - 3 * texel || y > footY[i] + 3 * texel) continue
    inside[n] = 1
    const v = clamp01((y - crestY[i]) / Math.max(1, footY[i] - crestY[i])), near = v * v * (3 - 2 * v), c = c0 + (c1 - c0) * near
    const down = (y - bounds.y - FOLLOW * (1 - v) * line[i]) * FLAT
    const bend = BENT * (2 * fractal(seed + 5, off, down, 0.006, 0.006, 1) - 1), x = off + bend, d = down + bend
    const level = Math.round(near * (LEVELS - 1))
    size[n] = c
    layout[n] = field(11, x, d, wL[level])
    rock[n] = field(41, x / LEDGE, d, wR[level])
    drift[n] = smooth(0.3, 0.7, fractal(seed + 131, off, down, 1 / DRIFT, 1 / DRIFT, 1))
    scrub[n] = field(71, x, d, wS[level])
    grain[n] = 2 * fractal(seed + 97, x, d, 1 / Math.max(2.2 * texel, 0.3 * c), 1 / Math.max(2.2 * texel, 0.3 * c), 1) - 1
    broad[n] = 2 * fractal(seed + 3, off, down, 1 / 110, 1 / 110, 1) - 1
    materialAt(plain, bounds.x + off, y, clamp01(off / Math.max(1, bounds.w)), v, base)
    // A grey palette (a town's ground) warmed toward the soil it lies on, its light kept.
    const hi = Math.max(base[0], base[1], base[2]), chroma = hi > 0 ? (hi - Math.min(base[0], base[1], base[2])) / hi : 0
    const warm = WARM * smooth(0.32, 0.06, chroma)
    baseOf[n * 3] = base[0] * (1 + warm); baseOf[n * 3 + 1] = base[1] * (1 + 0.15 * warm); baseOf[n * 3 + 2] = base[2] * (1 - warm)
    green[n] = smooth(-0.18, 0.12, (base[1] - base[0]) / Math.max(1e-4, base[1] + base[0]))
    if (y >= crestY[i] && y <= footY[i]) { dry += 1 - green[n]; seen++ }
  }
  dry = seen ? dry / seen : 1
  // The fields' own spread and the levels that give each its share of the ground.
  const sorted = (f: Float32Array) => Float32Array.from(f.filter((_, n) => inside[n])).sort()
  const rocks = sorted(rock), bushes = sorted(scrub), layouts = sorted(layout)
  const at = (s: Float32Array, q: number) => s.length ? s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))] : 0
  const spread = (s: Float32Array) => Math.max(1e-3, at(s, 0.84) - at(s, 0.16))
  const rocky = ROCKY[0] + (ROCKY[1] - ROCKY[0]) * dry, rockEdge = EDGE * spread(rocks)
  const soilAt = at(layouts, 0.62), grassAt = at(layouts, 0.36), layoutEdge = 0.35 * spread(layouts), bushEdge = EDGE * spread(bushes)

  const rho = new Float32Array(cells * 3), height = new Float32Array(cells)
  let was = 0, is = 0
  for (let n = 0; n < cells; n++) {
    if (!inside[n]) continue
    const o = n * 3, b0 = baseOf[o], b1 = baseOf[o + 1], b2 = baseOf[o + 2], g = green[n], k = size[n] / DEPTH.near[1]
    // Calmer toward the crest, where the air lies over it.
    const calm = calm0(k), fold = folds[n], tone = (1 + BROAD * broad[n] + calm * GRAIN * grain[n]) * (1 - BED * fold)
    const soil = calm * rough * smooth(soilAt - layoutEdge, soilAt + layoutEdge, layout[n])
    const grass = calm * rough * smooth(grassAt + layoutEdge, grassAt - layoutEdge, layout[n])
    // Rock gathers in its drifts, scrub in the rests between.
    const rockAt = at(rocks, 1 - rocky * (0.3 + 1.4 * drift[n])), rim = (f: number) => rough * smooth(rockAt - rockEdge, rockAt + rockEdge, f)
    // The rock a little up the slope: its ledge's lip falls here.
    const up = Math.round(BELOW * size[n] * ROCK / texel), above = n >= up * cols ? rock[n - up * cols] : rock[n]
    const stone = rim(rock[n]), ledge = UNDER * calm * rim(above) * (1 - stone)
    const bushAt = at(bushes, 1 - (SCRUBBY[0] + (SCRUBBY[1] - SCRUBBY[0]) * g) * (1.4 - 0.8 * drift[n]))
    const bush = rough * (1 - stone) * smooth(bushAt - bushEdge, bushAt + bushEdge, scrub[n])
    let r = b0, gg = b1, bb = b2
    // Soil and grass tint the ground; limestone breaks through it; scrub sits on what is left.
    r *= 1 + (SOIL[0] - 1) * soil + (GRASS[0] - 1) * grass
    gg *= 1 + (SOIL[1] - 1) * soil + (GRASS[1] - 1) * grass
    bb *= 1 + (SOIL[2] - 1) * soil + (GRASS[2] - 1) * grass
    const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * bb, pale = Math.max(1, lum / LIME[1] * 1.15), lime = LIMED * stone * calm
    r += (LIME[0] * pale - r) * lime; gg += (LIME[1] * pale - gg) * lime; bb += (LIME[2] * pale - bb) * lime
    const shrub = (c: number) => 1 + (SCRUBS[c] * g + STONES[c] * (1 - g) - 1) * bush * calm
    r *= shrub(0); gg *= shrub(1); bb *= shrub(2)
    const shut = tone * (1 - ledge)
    rho[o] = clamp01(r * shut); rho[o + 1] = clamp01(gg * shut); rho[o + 2] = clamp01(bb * shut)
    height[n] = rough * k * (SWELL * layout[n] + LIFT * stone + BUSH * bush + 0.5 * grain[n]) - DEEP * fold
    was += 0.2126 * b0 + 0.7152 * b1 + 0.0722 * b2
    is += 0.2126 * rho[o] + 0.7152 * rho[o + 1] + 0.0722 * rho[o + 2]
  }
  const even = is > 0 ? was / is : 1
  for (let n = 0; n < rho.length; n++) rho[n] = Math.min(1, rho[n] * even)
  return { rho, form: formOf(height, t) }
}

/** The form's slopes and open sky about their own means: the ground's whole tilt is in the light's field. */
function formOf(height: Float32Array, { wPx: cols, hPx: rows, bounds, crestY, footY, texel }: PlaneTexelCtx): Float32Array {
  const form = new Float32Array(height.length * 3), sum = [0, 0, 0]
  let seen = 0
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const left = height[i ? n - 1 : n], right = height[i < cols - 1 ? n + 1 : n]
    const above = height[j ? n - cols : n], below = height[j < rows - 1 ? n + cols : n], y = bounds.y + (j + 0.5) * texel
    form[n * 3] = (left - right) / (2 * texel)
    form[n * 3 + 1] = (below - above) / (2 * texel * FLAT)
    form[n * 3 + 2] = OPEN * height[n]
    if (y < crestY[i] || y > footY[i]) continue
    seen++
    for (let c = 0; c < 3; c++) sum[c] += form[n * 3 + c]
  }
  // The hill under each part of the crest: its side turned as the crest runs, fading down the plane toward the next hill.
  const run = hillsOf(crestY, Math.max(1, Math.round(HILL_PX / texel)), texel)
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const y = bounds.y + (j + 0.5) * texel, v = clamp01((y - crestY[i]) / Math.max(1, footY[i] - crestY[i]))
    form[n * 3] += HILL * run[i] * (1 - 0.65 * v)
  }
  for (let o = 0; seen && o < form.length; o += 3) {
    form[o] -= sum[0] / seen
    form[o + 1] -= sum[1] / seen
    form[o + 2] = Math.min(1.15, Math.max(0.8, 1 + form[o + 2] - sum[2] / seen))
  }
  return form
}

/** The crest's fall across each column (px a px), taken over `over` texels each side. */
function hillsOf(crest: Float32Array, over: number, texel: number): Float32Array {
  const n = crest.length
  return Float32Array.from(crest, (_, i) => {
    const a = crest[Math.max(0, i - over)], b = crest[Math.min(n - 1, i + over)]
    return Math.max(-1.5, Math.min(1.5, (b - a) / (2 * over * texel)))
  })
}

/** The crest's line about its own mean, its steps eased. */
function eased(crest: Float32Array, over: number): Float32Array {
  const n = crest.length, mean = crest.reduce((sum, y) => sum + y, 0) / n
  return Float32Array.from(crest, (_, i) => {
    let sum = 0
    for (let k = -over; k <= over; k++) sum += crest[Math.min(n - 1, Math.max(0, i + k))]
    return sum / (2 * over + 1) - mean
  })
}
