import { linearRgbToSrgb, shadeLinearRgb } from '../../../model/landRadiance'
import { fieldSample, shadowBeam, type FieldSample } from '../../../model/planeField'
import { TEXEL } from '../../../model/planeBands'
import { labOf, rgbOfLab } from '../../../model/tone'
import type { RGB } from '../../../model/types'
import { smoothstep } from '../../../../domain/smoothstep'
import { samplePlaneTexel, type PlaneTexelCtx } from '../../shared/land/planeTexel'
import { traceOver } from '../kit/contour'
import { ease } from '../kit/ease'
import type { Tier } from '../kit/lines'
import { skied } from '../kit/palette'
import { frameOf, type Ground } from './pots'

/*
 * The shade blocks: the model's own light on the plane (sun on the slope's facing, moon and sky) read where the land truly
 * lies, cut at the plane's own quantiles into a base block, a lit one and a shade one, so a sunny hillside always has a lit
 * side and a shade side that follow its slopes. Islands under the least area go back to the block round them; each block
 * is knife-edged. Its ink is the pot's base ink stepped in value only (same hue), by the model's own step or at least a
 * visible one while the sun is in the beam. Every beam gets its own inks on the same shapes.
 */

/**
 * The blocks: base, lit, shade; the share of the plane's light under the shade cut and over the lit one, by tier (none: no
 * such block). The base is the lit side as the plate prints it; a lit block of its own read as pale stains, so none is cut.
 */
export const BASE = 0, LIT = 1, SHADE = 2
const CUTS: Readonly<Record<Tier, { shade: number; lit: number }>> = {
  near: { shade: 0.27, lit: 1 }, far: { shade: 0, lit: 1 }, back: { shade: 0, lit: 1 },
}
/** The least step of value (Oklab, a share of the base's) a lit and a shade block take in full sun; their chroma against the base's. */
const STEP = { lit: 0.06, shade: -0.09 } as const, CHROMA = { lit: 1.02, shade: 0.92 } as const
/** The least area a block keeps (cells, and share of the plane), the reach its outline is eased over (cells), the least points of a shape. */
/** The step of value (Oklab) at which a block shows in full. */
const SHOWN = 0.04
const AREA = 40, AREA_SHARE = 0.025, SOFT = 2.4, LEAST_SHAPE = 6
/** A hillside flattens toward its foot and takes more of the sky: the cut is read with this much of the light's spread added at the foot, so a shade block narrows downhill as a slope's shade does. */
const FLATTEN = 1.4

interface Light extends FieldSample { n: number }
/** A block: its outline (none for the base), its inks by target and pot, the clear air in front of it, how plainly it shows by target (0 … 1). */
interface Level { path: Path2D | null; inks: RGB[][]; air: number; shown: number[] }
export interface Shading { levels: (Level | null)[]; levelAt: Uint8Array; light: Float32Array }

const lum = (rgb: RGB) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]

export function shadingOf(t: PlaneTexelCtx, ground: Ground, tier: Tier, paired: boolean): Shading {
  const { litField: f } = t, { light, fields } = lightOn(t, ground), cells = levelsOf(t, ground, light, tier)
  // Each block's outline is its cells eased; a place is in the block its outline holds, so marks and inks follow the cut edge.
  const soft = [BASE, LIT, SHADE].map((v) => (v === BASE || !cells.includes(v) ? null : softened(t, cells, v))), levelAt = new Uint8Array(cells.length)
  soft.forEach((at, v) => at?.forEach((k, n) => { if (k > 0.5) levelAt[n] = v }))
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
  return { levelAt, light, levels: cut.map((l, v) => l && { path: soft[v] ? outlined(t, soft[v]!) : null, inks: inks.map((by) => by[v]), air: 1 - air, shown: shown(v) }) }
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

/** Each cell's block: cut at the plane's own quantiles of light, islands under the least area given to the block round them. */
function levelsOf(t: PlaneTexelCtx, { on }: Ground, light: Float32Array, tier: Tier): Uint8Array {
  const raw = light.filter((_, n) => on[n]).sort(), q = (k: number) => raw[Math.min(raw.length - 1, Math.floor(k * raw.length))] ?? 1
  const spread = q(0.8) - q(0.2), { wPx: cols, bounds, crestY, footY } = t
  const read = light.map((v, n) => {
    const i = n % cols, y = bounds.y + (Math.floor(n / cols) + 0.5) * TEXEL
    return v + FLATTEN * spread * Math.min(1, Math.max(0, (y - crestY[i]) / Math.max(1, footY[i] - crestY[i]))) ** 1.5
  })
  const held = read.filter((_, n) => on[n]).sort(), { shade, lit } = CUTS[tier]
  const at = (k: number, of: Float32Array) => (k <= 0 ? -Infinity : k >= 1 ? Infinity : of[Math.min(of.length - 1, Math.floor(k * of.length))] ?? 1)
  // The shade is read on the flattening hillside; the lit block is the slopes turned to the light, as they truly are.
  const low = at(shade, held), high = at(lit, raw)
  const levelAt = Uint8Array.from(read, (_, n) => (read[n] < low ? SHADE : light[n] > high ? LIT : BASE))
  const least = Math.max(AREA, AREA_SHARE * held.length)
  for (let pass = 0; pass < 2; pass++) islands(t.wPx, t.hPx, levelAt, least)
  return levelAt
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
  traceOver(path, { cols: t.wPx, rows: t.hPx, at }, 0.5, frameOf(t), LEAST_SHAPE)
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
