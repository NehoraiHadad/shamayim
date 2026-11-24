import { linearRgbToSrgb, shadeLinearRgb } from '../../../model/landRadiance'
import { fieldSample, shadowBeam, type FieldSample } from '../../../model/planeField'
import { TEXEL } from '../../../model/planeBands'
import { labOf, rgbOfLab } from '../../../model/tone'
import type { RGB } from '../../../model/types'
import { samplePlaneTexel, type PlaneTexelCtx } from '../../shared/land/planeTexel'
import { traceOver } from '../kit/contour'
import { ease } from '../kit/ease'
import { skied } from '../kit/palette'
import { columnAt, frameOf, type Ground } from './pots'

/*
 * The shade block: the model's own light on the plane (sun, moon and sky together) cut into a few levels, each outlined;
 * one ink to a pot, a level and a band of the plane's depth: the mean light there on the pot's reflectance, with its air.
 * Every beam gets its own inks on the same shapes.
 */

/** Light against the plane's mean: the base 0, then where each level begins; how warm or cool its ink leans. */
const LEVELS = [{ side: 0, at: 0, turn: 0.1 }, { side: 1, at: 1.13, turn: 0.5 }, { side: -1, at: 0.87, turn: -0.4 }, { side: -1, at: 0.62, turn: -0.7 }] as const
/** The bands of the plane's depth an ink is wiped through; how far values part about their band's mean; the least cells and points a level is cut for. */
const BANDS = 4, PART = 1.25, LEAST = 6, LEAST_SHAPE = 6

interface Light extends FieldSample { n: number }
/** A level: its outline (none for the base), its inks by target, pot and band, and the clear air of each band. */
interface Level { path: Path2D | null; inks: RGB[][][]; air: number[] }
export interface Shading { levels: (Level | null)[]; levelAt: Uint8Array; light: Float32Array }

const lum = (rgb: RGB) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
export const bandAt = (t: PlaneTexelCtx, n: number) => Math.min(BANDS - 1, Math.floor((Math.floor(n / t.wPx) / t.hPx) * BANDS))

export function shadingOf(t: PlaneTexelCtx, ground: Ground, paired: boolean): Shading {
  const { litField: f } = t, { light, fields } = lightOn(t, ground), count = light.length
  const levelAt = Uint8Array.from(light, (v) => (v > LEVELS[1].at ? 1 : v < LEVELS[3].at ? 3 : v < LEVELS[2].at ? 2 : 0))
  const lights = LEVELS.map(() => Array.from({ length: BANDS }, (): Light => ({ ...fieldSample(), n: 0 })))
  for (let n = 0; n < count; n++) {
    if (!ground.on[n]) continue
    const l = lights[levelAt[n]][bandAt(t, n)]
    l.n++
    l.sVis += fields[0][n]
    l.mVis += fields[1][n]
    l.vSky += fields[2][n]
    l.haze += fields[3][n]
  }
  const cut = lights.map((bands) => (bands.reduce((sum, b) => sum + b.n, 0) >= LEAST ? bands.map((_, b) => meanAt(bands, b)) : null))
  if (!cut[0]) cut[0] = cut.find((c) => c) ?? [...lights[0]]
  const labs = (paired ? [f.eSun, shadowBeam(f)] : [f.eSun]).map((beam) => labsOf(t, ground, cut, beam)), means = meansOf(ground, cut, labs[0])
  const inks = labs.map((of) => inksOf(of, cut, means))
  return { levelAt, light, levels: cut.map((bands, v) => bands && {
    path: v ? outlined(t, light, LEVELS[v]) : null, inks: inks.map((by) => by[v]), air: bands.map((b) => 1 - b.haze),
  }) }
}

/** The light of every cell against the plane's mean, and the four fields it comes from. */
function lightOn(t: PlaneTexelCtx, { pots, label, on, bent }: Ground) {
  const { wPx: cols, hPx: rows, litField: f, bounds } = t, cells = cols * rows
  const fields = [0, 1, 2, 3].map(() => new Float32Array(cells)), light = new Float32Array(cells)
  const s = { ...fieldSample(), rho: [0, 0, 0] as [number, number, number] }, sun = lum(f.eSun), moon = lum(f.eMoon), sky = lum(f.eSky)
  let sum = 0, held = 0
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    samplePlaneTexel(t, columnAt(t, bent[n]), bent[n], bounds.y + (j + 0.5) * TEXEL, pots[label[n]].rho, s)
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

/** A band's mean light, or its nearest neighbour's where the level has none there. */
function meanAt(bands: readonly Light[], b: number): Light {
  const at = [...bands.keys()].filter((k) => bands[k].n).sort((p, q) => Math.abs(p - b) - Math.abs(q - b))[0], l = bands[at]
  return { n: bands[b].n, sVis: l.sVis / l.n, mVis: l.mVis / l.n, vSky: l.vSky / l.n, haze: l.haze / l.n }
}

function outlined(t: PlaneTexelCtx, light: Float32Array, { side, at }: (typeof LEVELS)[number]): Path2D {
  const path = new Path2D()
  traceOver(path, { cols: t.wPx, rows: t.hPx, at: side > 0 ? light : light.map((v) => -v) }, side * at, frameOf(t), LEAST_SHAPE)
  return path
}

type Cut = readonly (readonly Light[] | null)[]
type Labs = ReturnType<typeof labsOf>

/** The light of every level, pot and band, under one beam. */
function labsOf({ litField: f }: PlaneTexelCtx, { pots }: Ground, cut: Cut, beam: RGB) {
  return cut.map((bands) => pots.map(({ rho }) => (bands ?? []).map((l) =>
    labOf(linearRgbToSrgb(shadeLinearRgb(rho, beam, f.eMoon, f.eSky, l.sVis, l.mVis, l.vSky, f.yHorizon, l.haze, f.hazeLin))))))
}

/** The mean value of every band of the plane. */
function meansOf({ pots }: Ground, cut: Cut, labs: Labs) {
  return Array.from({ length: BANDS }, (_, b) => {
    let sum = 0, whole = 0
    cut.forEach((bands, v) => bands && pots.forEach((pot, p) => {
      const w = pot.count * bands[b].n
      sum += w * labs[v][p][b].l
      whole += w
    }))
    return whole ? sum / whole : null
  })
}

/** The inks, parted about the bands' means under the whole sun: where no sun comes in, a cloud's shadow leaves them as they are. */
function inksOf(labs: Labs, cut: Cut, means: readonly (number | null)[]): RGB[][][] {
  return labs.map((byPot, v) => byPot.map((byBand) => byBand.map((lab, b) => {
    const mean = means[b] ?? lab.l, air = Math.round(cut[v]![b].haze * 20) / 20, turn = LEVELS[v].turn * (1 - air)
    return skied(rgbOfLab({ ...lab, l: Math.min(1, Math.max(0, mean + PART * (lab.l - mean))) }), turn, air)
  })))
}
