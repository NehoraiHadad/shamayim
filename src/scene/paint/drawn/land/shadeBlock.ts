import { linearRgbToSrgb, shadeLinearRgb } from '../../../model/landRadiance'
import { fieldSample, shadowBeam, type FieldSample } from '../../../model/planeField'
import { TEXEL } from '../../../model/planeBands'
import { labOf, rgbOfLab } from '../../../model/tone'
import type { RGB } from '../../../model/types'
import { smoothstep } from '../../../../domain/smoothstep'
import { samplePlaneTexel, type PlaneTexelCtx } from '../../shared/land/planeTexel'
import { traceOver } from '../kit/contour'
import { ease } from '../kit/ease'
import { distances } from '../kit/distance'
import type { Tier } from '../kit/lines'
import { skied } from '../kit/palette'
import { frameOf, type Ground } from './pots'

/*
 * The shade blocks: the model's own light on the plane (sun on the slope's facing, moon and sky) read where the land truly
 * lies, cut where the slopes turn from the sun: a hillside's shade side runs from its ridge or spur down to the foot or the
 * next fold, as far as the land's own relief makes one. A plane of little relief takes no shade block (its light is even);
 * islands under the least area go back to the block round them, and every block is knife-edged. Its ink is the pot's base
 * ink stepped in value only (same hue), by the model's own step or at least a visible one while the sun is in the beam.
 * Every beam gets its own inks on the same shapes.
 */

/**
 * The blocks: base, lit, shade. The base is the lit side as the plate prints it; a lit block of its own read as pale
 * stains, so none is cut. Which tiers take a shade block at all.
 */
export const BASE = 0, LIT = 1, SHADE = 2
const SHADED: Readonly<Record<Tier, boolean>> = { near: true, far: false, back: false }
/**
 * The relief that makes a shade side: the spread of the plane's light (its 80th less its 20th percentile, against its mean;
 * the sky's even light is in it, so a steep sunny hillside spreads it by a tenth or so) under which no block is cut, and at
 * which the most is; the most of the plane it may hold; where between the mean and the
 * dark the cut stands, as a share of the spread (the turn of the slope from the sun is the steepest fall of its light, at
 * the mean, so the edge runs down the ridge or the spur).
 */
const RELIEF = { least: 0.06, full: 0.14 } as const, MOST = 0.42, TURN = 0.2
/**
 * A run of shade is a hillside's when it reaches within this depth of the ridge (share of the plane's depth); how much brighter than the cut (a share of the spread) a slope hung from the ridge may grow and stay in it; the
 * least half-width of a run across the slope (cells).
 */
const RIDGE = 0.15, HOLD = 0.35, NARROW = 1
/** The least step of value (Oklab, a share of the base's) a lit and a shade block take in full sun; their chroma against the base's. */
const STEP = { lit: 0.06, shade: -0.09 } as const, CHROMA = { lit: 1.02, shade: 0.92 } as const
/** The step of value (Oklab) at which a block shows in full. */
const SHOWN = 0.04
/** The least area a block keeps (cells, and share of the plane), the reach its outline is eased over (cells), the least points of a shape. */
const AREA = 40, AREA_SHARE = 0.025, SOFT = 1, LEAST_SHAPE = 6

interface Light extends FieldSample { n: number }
/** A block: its outline (none for the base), its inks by target and pot, the clear air in front of it, how plainly it shows by target (0 … 1). */
interface Level { path: Path2D | null; inks: RGB[][]; air: number; shown: number[] }
/** Each block, the light of every cell, and how far in from the shade block's edge each cell lies (cells; below 0 outside). */
export interface Shading { levels: (Level | null)[]; levelAt: Uint8Array; light: Float32Array; inside: Float32Array }

const lum = (rgb: RGB) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]

export function shadingOf(t: PlaneTexelCtx, ground: Ground, tier: Tier, paired: boolean): Shading {
  const { litField: f } = t, { light, fields } = lightOn(t, ground), cells = levelsOf(t, ground, light, tier)
  // Each block's outline is its cells eased; a place is in the block its outline holds, so marks and inks follow the cut edge.
  const soft = [BASE, LIT, SHADE].map((v) => (v === BASE || !cells.includes(v) ? null : softened(t, cells, v))), levelAt = new Uint8Array(cells.length)
  soft.forEach((at, v) => at?.forEach((k, n) => { if (k > 0.5) levelAt[n] = v }))
  const inside = soft[SHADE] ? distances({ cols: t.wPx, rows: t.hPx, at: soft[SHADE]!.map((k) => k - 0.5) }).at : new Float32Array(cells.length).fill(-1)
  const lights = [BASE, LIT, SHADE].map((): Light => ({ ...fieldSample(), n: 0 }))
  for (let n = 0; n < light.length; n++) {
    if (!ground.on[n]) continue
    const l = lights[levelAt[n]]
    l.n++
    l.sVis += fields[0][n]
    l.mVis += fields[1][n]
    l.vSky += fields[2][n]
    l.haze += fields[3][n]
  }
  const cut = lights.map((l) => (l.n ? { n: l.n, sVis: l.sVis / l.n, mVis: l.mVis / l.n, vSky: l.vSky / l.n, haze: l.haze / l.n } : null))
  if (!cut[BASE]) cut[BASE] = cut.find((c) => c) ?? { ...fieldSample(), n: 0 }
  // One air for the whole plane: its blocks are cut in one wood, and the air is in the base ink.
  const air = Math.round(cut[BASE]!.haze * 20) / 20
  const beams = paired ? [f.eSun, shadowBeam(f)] : [f.eSun], inks = beams.map((beam) => inksOf(t, ground, cut, beam, air))
  // A block whose ink is (nearly) the base's shows no edge and takes no hatches: no outline of a shade that is not there.
  const shown = (v: number) => inks.map((by) => Math.min(1, Math.abs(labOf(by[v][0]).l - labOf(by[BASE][0]).l) / SHOWN))
  return { levelAt, light, inside, levels: cut.map((l, v) => l && { path: soft[v] ? outlined(t, soft[v]!) : null, inks: inks.map((by) => by[v]), air: 1 - air, shown: shown(v) }) }
}

/** The light of every cell against the plane's mean, where it truly lies, and the four fields it comes from. */
function lightOn(t: PlaneTexelCtx, { pots, label, on }: Ground) {
  const { wPx: cols, hPx: rows, litField: f, bounds } = t, cells = cols * rows
  const fields = [0, 1, 2, 3].map(() => new Float32Array(cells)), light = new Float32Array(cells)
  const s = { ...fieldSample(), rho: [0, 0, 0] as [number, number, number] }, sun = lum(f.eSun), moon = lum(f.eMoon), sky = lum(f.eSky)
  let sum = 0, held = 0
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    samplePlaneTexel(t, i, bounds.x + (i + 0.5) * TEXEL, bounds.y + (j + 0.5) * TEXEL, pots[label[n]].rho, s)
    fields[0][n] = s.sVis
    fields[1][n] = s.mVis
    fields[2][n] = s.vSky
    fields[3][n] = s.haze
    light[n] = sun * s.sVis + moon * s.mVis + sky * s.vSky
    if (!on[n]) continue
    sum += light[n]
    held++
  }
  const mean = Math.max(1e-9, sum / Math.max(1, held))
  for (let n = 0; n < cells; n++) light[n] /= mean
  ease(light, cols, rows, Array<number>(rows).fill(1), Array<number>(rows).fill(0.7))
  return { light, fields }
}

/**
 * Each cell's block. The shade is where the light falls past the slope's turn from the sun, as much of it as the relief
 * makes, and only as a hillside's side is: a run that hangs from the ridge, never a pool in mid-slope or a tongue up from
 * the foot; it runs on down while the slope stays turned away (the light under `HOLD`), to the foot or to the next fold that
 * turns back to the sun. Slivers narrower than the least width are cut away, islands
 * under the least area go to the block round them. Above the crest each column takes the block under it, so a shade side
 * that meets the skyline runs up into the key line and leaves no lit strip under it.
 */
function levelsOf(t: PlaneTexelCtx, { on }: Ground, light: Float32Array, tier: Tier): Uint8Array {
  const levelAt = new Uint8Array(light.length), held = light.filter((_, n) => on[n]).sort()
  const q = (k: number) => held[Math.min(held.length - 1, Math.floor(k * held.length))] ?? 1
  const spread = q(0.8) - q(0.2), relief = smoothstep(RELIEF.least, RELIEF.full, spread)
  if (!SHADED[tier] || !held.length || relief <= 0) return levelAt
  // The turn below the mean, and never more of the plane than the relief allows.
  const low = Math.min(1 - TURN * spread, q(MOST * relief)), hold = low + HOLD * spread
  const { wPx: cols, hPx: rows, bounds, crestY, footY } = t
  const depth = (n: number) => {
    const i = n % cols, y = bounds.y + (Math.floor(n / cols) + 0.5) * TEXEL
    return (y - crestY[i]) / Math.max(1, footY[i] - crestY[i])
  }
  const dark = opened(cols, Uint8Array.from(light, (v, n) => (on[n] && v < low ? 1 : 0)), NARROW)
  for (const run of runs(cols, rows, dark)) {
    const from = run.reduce((most, n) => Math.min(most, depth(n)), Infinity)
    if (from > RIDGE) continue
    for (const n of run) levelAt[n] = SHADE
    // On down the hillside (and across it, never back up) while the slope stays turned from the sun.
    const stack = [...run]
    while (stack.length) {
      const n = stack.pop()!, i = n % cols
      for (const m of [n + cols, i ? n - 1 : -1, i < cols - 1 ? n + 1 : -1]) {
        if (m < 0 || m >= light.length || !on[m] || levelAt[m] || light[m] >= hold) continue
        levelAt[m] = SHADE
        stack.push(m)
      }
    }
  }
  for (let i = 0; i < cols; i++) {
    const top = Math.max(0, Math.min(rows - 1, Math.floor((crestY[i] - bounds.y) / TEXEL) + 1))
    for (let j = 0; j < top; j++) levelAt[j * cols + i] = levelAt[top * cols + i]
  }
  const least = Math.max(AREA, AREA_SHARE * held.length)
  for (let pass = 0; pass < 2; pass++) islands(cols, rows, levelAt, least)
  return levelAt
}

/** A mask with every run narrower than `reach` cells either side (across the slope) cut away: eroded, then grown back. */
function opened(cols: number, mask: Uint8Array, reach: number): Uint8Array {
  const pass = (from: Uint8Array, all: boolean) => Uint8Array.from(from, (_, n) => {
    const i = n % cols
    for (let d = -reach; d <= reach; d++) {
      const k = Math.min(cols - 1, Math.max(0, i + d)), w = from[n - i + k]
      if (all ? !w : w) return all ? 0 : 1
    }
    return all ? 1 : 0
  })
  return pass(pass(mask, true), false)
}

/** The connected runs (four ways) of a mask's set cells. */
function runs(cols: number, rows: number, mask: Uint8Array): number[][] {
  const seen = new Uint8Array(mask.length), out: number[][] = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    const run: number[] = [], stack = [start]
    seen[start] = 1
    while (stack.length) {
      const n = stack.pop()!, i = n % cols, j = (n - i) / cols
      run.push(n)
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj, m = jj * cols + ii
        if (ii < 0 || jj < 0 || ii >= cols || jj >= rows || !mask[m] || seen[m]) continue
        seen[m] = 1
        stack.push(m)
      }
    }
    out.push(run)
  }
  return out
}

/** Every connected run of one block smaller than `least` cells takes the block most of its rim stands in. */
function islands(cols: number, rows: number, levelAt: Uint8Array, least: number) {
  const seen = new Uint8Array(levelAt.length), stack: number[] = []
  for (let start = 0; start < levelAt.length; start++) {
    if (seen[start]) continue
    const v = levelAt[start], run: number[] = [], rim = [0, 0, 0]
    seen[start] = 1
    stack.push(start)
    while (stack.length) {
      const n = stack.pop()!, i = n % cols, j = (n - i) / cols
      run.push(n)
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj
        if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue
        const m = jj * cols + ii
        if (levelAt[m] !== v) rim[levelAt[m]]++
        else if (!seen[m]) { seen[m] = 1; stack.push(m) }
      }
    }
    if (run.length >= least || !(rim[0] + rim[1] + rim[2])) continue
    const to = rim.indexOf(Math.max(...rim))
    for (const n of run) levelAt[n] = to
  }
}

function softened(t: PlaneTexelCtx, levelAt: Uint8Array, v: number): Float32Array {
  const at = Float32Array.from(levelAt, (l) => (l === v ? 1 : 0))
  ease(at, t.wPx, t.hPx, Array<number>(t.hPx).fill(SOFT), Array<number>(t.hPx).fill(SOFT * 0.7))
  return at
}

function outlined(t: PlaneTexelCtx, at: Float32Array): Path2D {
  const path = new Path2D()
  traceOver(path, { cols: t.wPx, rows: t.hPx, at }, 0.5, frameOf(t), LEAST_SHAPE, 1)
  return path
}

/** The inks of every block and pot under one beam: the base the model's, the others its value stepped, hue held. */
function inksOf({ litField: f }: PlaneTexelCtx, { pots }: Ground, cut: readonly (Light | null)[], beam: RGB, air: number): RGB[][] {
  const labOn = (rho: RGB, l: Light) =>
    labOf(linearRgbToSrgb(shadeLinearRgb(rho, beam, f.eMoon, f.eSky, l.sVis, l.mVis, l.vSky, f.yHorizon, air, f.hazeLin)))
  // How much the sun is the light here: none in a cloud's shadow or at night, where no step is made that the model does not make.
  const sunny = smoothstep(0.25, 0.65, lum(beam) / Math.max(1e-6, lum(beam) + lum(f.eSky) + lum(f.eMoon)))
  return cut.map((l, v) => pots.map(({ rho }) => {
    const base = labOn(rho, cut[BASE]!)
    if (!l || v === BASE) return skied(rgbOfLab(base), 0, air)
    const own = labOn(rho, l), least = (v === LIT ? STEP.lit : STEP.shade) * base.l * sunny
    const step = v === LIT ? Math.max(own.l - base.l, least) : Math.min(own.l - base.l, least), k = v === LIT ? CHROMA.lit : CHROMA.shade
    return skied(rgbOfLab({ l: Math.min(1, Math.max(0, base.l + step)), a: base.a * k, b: base.b * k }), 0, air)
  }))
}
