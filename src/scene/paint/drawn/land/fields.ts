import { smoothstep } from '../../../../domain/smoothstep'
import { labOf, rgbOfLab, toLinear, toSrgb } from '../../../model/tone'
import type { LayerOf, RGB } from '../../../model/types'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverBrush, ReceiverInk } from '../../shared/land/receiverBrush'
import { rng } from '../../shared/base/core'
import { h01 } from '../../shared/land/vegInk'
import { carve, type P } from '../kit/carve'
import { CUT_LINE } from '../kit/lines'
import { stepped, type InkAt } from './groundInk'
import { groundFields } from './groundMarks'
import { cellAt, type Ground } from './pots'

/*
 * The model's fields, beds and rows as the print cuts them: a field is a block of its own, flat and opaque, printed in the
 * ink of the ground under it (its block, its light, its air) turned to the field's own material, so it darkens with the
 * hour as the land does; a few fields stand a step lighter or darker, as a patchwork does. Strata and orchard rows are
 * carved cuts, thinner than the key line, in the ground's ink a step darker. No soft stroke, no translucent decal.
 */

/** The least a field's or a cut's weight in the model must be to be printed; the patchwork's steps of value (Oklab). */
const LEAST = 0.25, PATCH = [-0.035, 0, 0.025] as const
/** How far a field's material may turn its ground's ink, each channel (linear, a factor each way). */
const TURN = 2.2
/** How much of the step of value between the ground's material and the field's the field keeps. */
const VALUE = 0.4
/** The ground's values over which a field keeps its own hue in full, and how much of it it keeps under them (dusk). */
const DUSK = { from: 0.3, to: 0.5, keep: 0.4 } as const
/** The furrows a ploughed field takes, their ink's step; a stratum's and a row's step of value and their width (share of the tier's cut). */
/** A stratum's runs and the gaps between them (px). */
const RUN = [10, 26] as const, GAP = [4, 12] as const
const FURROWS = 3, FURROW_DARK = -0.08, CUT_DARK = -0.11, SEED = 7711

/** The strata and the fields, each field in its carved edge. */
export function printFields(brush: ReceiverBrush, desc: LayerOf<'plane'>, t: PlaneTexelCtx, ground: Ground, inkAt: InkAt): void {
  const { vegetation: veg } = desc, tier = desc.plane
  // Strata: the bedding cut in short runs along the slope, a hair bowed, with the gaps a knife leaves where the bed dips.
  for (let o = 0, i = 0; o + 6 <= veg.strata.length; o += 6, i++) {
    const [x0, y0, x1, y1, thick, alpha] = Array.from(veg.strata.slice(o, o + 6))
    if (alpha < LEAST * 0.4) continue
    const d = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / d, uy = (y1 - y0) / d, r = rng(SEED + veg.seed * 31 + i)
    const path = brush.path(), wide = CUT_LINE[tier] * Math.min(1, Math.max(0.6, thick / 2))
    for (let at = r() * GAP[1]; at < d - 3; ) {
      const long = Math.min(d - at, RUN[0] + r() * (RUN[1] - RUN[0])), bow = (r() - 0.5) * 1.6, sag = (r() - 0.5) * 1.2
      const a: P = [x0 + ux * at, y0 + uy * at + sag], b: P = [x0 + ux * (at + long), y0 + uy * (at + long) + sag]
      carve(path, [a, [(a[0] + b[0]) / 2 - uy * bow, (a[1] + b[1]) / 2 + ux * bow], b], wide, SEED + i * 13 + Math.round(at), 0)
      at += long + GAP[0] + r() * (GAP[1] - GAP[0])
    }
    brush.fill(stepped(inkAt((x0 + x1) / 2, (y0 + y1) / 2), CUT_DARK), 0.9)
  }
  const { fields, fieldMeta, tones } = veg
  for (let o = 0, i = 0; o + 9 <= fields.length; o += 9, i++) {
    if (fields[o + 8] < LEAST || !tones.length) continue
    const at = [0, 1, 2, 3].map((k): P => [fields[o + k * 2], fields[o + k * 2 + 1]])
    // A field is printed only where the whole of it lies on this plane's ground (never over a shore or past the crest).
    if (!at.every(([x, y]) => ground.on[cellAt(t, x, y)])) continue
    const cx = (at[0][0] + at[1][0] + at[2][0] + at[3][0]) / 4, cy = (at[0][1] + at[1][1] + at[2][1] + at[3][1]) / 4
    const under = inkAt(cx, cy), pot = ground.pots[under.key % ground.pots.length]
    const tone = tones[fieldMeta[i * 2 + 1]] ?? tones[0], patch = PATCH[Math.floor(h01(veg.seed, at[0][0], at[0][1], 41) * PATCH.length)]
    const ink = turned(under.ink, pot.rho, tone, patch)
    const path = brush.path()
    at.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y)))
    path.closePath()
    brush.fill(ink, 1)
    // A ploughed field's furrows: a few cuts along its near side's run.
    if (fieldMeta[i * 2] === 1 && tier === 'near') {
      const cuts = brush.path()
      for (let r = 1; r <= FURROWS; r++) {
        const f = r / (FURROWS + 1), from: P = [at[0][0] + (at[3][0] - at[0][0]) * f, at[0][1] + (at[3][1] - at[0][1]) * f]
        const to: P = [at[1][0] + (at[2][0] - at[1][0]) * f, at[1][1] + (at[2][1] - at[1][1]) * f]
        const inset = (a: P, b: P): P => [a[0] + (b[0] - a[0]) * 0.08, a[1] + (b[1] - a[1]) * 0.08]
        carve(cuts, [inset(from, to), inset(to, from)], CUT_LINE[tier] * 0.8, SEED + o + r, 0)
      }
      brush.fill(stepped({ ...under, ink }, FURROW_DARK), 0.9)
    }
  }
  groundFields(brush, fields, inkAt)
}

/** The orchard and plantation rows: a carved cut each. */
export function printRows(brush: ReceiverBrush, desc: LayerOf<'plane'>, inkAt: InkAt): void {
  const { rows } = desc.vegetation, tier = desc.plane
  for (let o = 0; o + 6 <= rows.length; o += 6) {
    if (rows[o + 5] < LEAST * 0.4) continue
    const a: P = [rows[o], rows[o + 1]], b: P = [rows[o + 2], rows[o + 3]]
    carve(brush.path(), [a, b], Math.min(CUT_LINE[tier], Math.max(0.3, rows[o + 4])), SEED + o, 0)
    brush.fill(stepped(inkAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), CUT_DARK), 0.9)
  }
}

/** The ground's ink, on each target, turned from its pot's material to the field's (linear, per channel), at a patchwork step of value. */
function turned([lit, shade]: ReceiverInk, rho: RGB, tone: RGB, patch: number): ReceiverInk {
  // The palette's tones are an illustrator's, not albedos: their hue is taken whole, their value only in part.
  const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], lin = tone.map(toLinear)
  const value = (lum(lin) / Math.max(1e-4, lum(rho))) ** (1 - VALUE)
  const by = [0, 1, 2].map((m) => Math.min(TURN, Math.max(1 / TURN, lin[m] / Math.max(1e-4, rho[m]) / value)))
  const turn = (rgb: RGB): RGB => {
    const out = rgb.map((v, m) => toSrgb(Math.min(1, toLinear(v) * by[m]))) as unknown as RGB, lab = labOf(out), under = labOf(rgb)
    // The field's own hue fades with the light as the ground's does: at dusk a field is its ground a step off, not a green lamp.
    const hue = DUSK.keep + (1 - DUSK.keep) * smoothstep(DUSK.from, DUSK.to, under.l)
    return rgbOfLab({ l: Math.min(1, Math.max(0, lab.l + patch * Math.min(1, lab.l / 0.6))),
      a: under.a + (lab.a - under.a) * hue, b: under.b + (lab.b - under.b) * hue })
  }
  return [turn(lit), shade && turn(shade)]
}
