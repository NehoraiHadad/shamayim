import { TEXEL } from '../../../model/planeBands'
import type { LayerOf } from '../../../model/types'
import { displace, rng, sample, tube } from '../../shared/base/core'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverBrush } from '../../shared/land/receiverBrush'
import { carve, type P } from '../kit/carve'
import { columnAt } from './pots'
import { stepped, type GroundInk, type InkAt } from './groundInk'

/* The hand's marks on the ground: the gullies, terraces and fields the model gives as clean cuts, and the graver's cuts along the slope. */

/** A clean cut's value from the ground's. */
const CUT = -0.36, SEED = 5501

export function groundLines(brush: ReceiverBrush, desc: LayerOf<'plane'>, inkAt: InkAt): void {
  const cut = ([x, y]: readonly [number, number]) => stepped(inkAt(x, y), CUT, -0.6)

  desc.gullies.forEach((gully, i) => {
    const line = displace(sample(gully.points, false, 5), 1.1, 0.3, 2, desc.grain.seed + i * 13)
    if (line.length < 2) return
    const path = brush.path()
    tube(line, gully.w * 0.6, gully.w * 0.1, false).forEach(([x, y], j) => (j ? path.lineTo(x, y) : path.moveTo(x, y)))
    path.closePath()
    brush.fill(cut(line[line.length >> 1]), gully.alpha * 1.1)
  })
  for (const run of desc.terraces) {
    if (run.length < 2) continue
    const path = brush.path()
    run.forEach(([x, y], i) => (i ? path.lineTo(x, y + 0.45) : path.moveTo(x, y + 0.45)))
    brush.stroke(cut(run[run.length >> 1]), 0.2, 0.7)
  }
}

/** A field's edge (px), how much darker than the ground, how strong; the numbers a field takes in the desc. */
const FIELD = { wide: 0.6, dark: -0.17, alpha: 0.7, stride: 9 } as const

/** The fields the model gives, each inside a thin carved edge. */
export function groundFields(brush: ReceiverBrush, fields: Float32Array, inkAt: InkAt): void {
  for (let o = 0; o + FIELD.stride <= fields.length; o += FIELD.stride) {
    const at = [0, 1, 2, 3, 0].map((k): P => [fields[o + k * 2], fields[o + k * 2 + 1]])
    carve(brush.path(), at, FIELD.wide, SEED + o, 0)
    brush.fill(stepped(inkAt((at[0][0] + at[2][0]) / 2, (at[0][1] + at[2][1]) / 2), FIELD.dark, -0.4), FIELD.alpha * fields[o + 8])
  }
}

/** Cuts a plane takes per 1000 px²; their length (px) at the foot, their width, how far their value goes from the ground's. */
const DENSITY = { near: 24, far: 9, back: 1.5 } as const
const LONG = [3, 20] as const, WIDE = [0.35, 0.6] as const, LIGHT = 0.06, DARK = -0.13, DARKS = 0.78
/** Cuts stand in hatches: a hatch's most, the px between its cuts; how close they stand by the light there, at least and at most. */
const HATCH = 4, BESIDE = 1.9, IN_MEAN = 0.4, BY_LIGHT = 2.2, CLOSE = [0.3, 1] as const

interface Dab { x: number; y: number; len: number; dy: number; bow: number; wide: number; deep: number; seed: number; cuts: number }

/** The graver's cuts along the slope: mostly dark, closer in the shade, shorter far off. One fill an ink. */
export function groundDabs(brush: ReceiverBrush, desc: LayerOf<'plane'>, t: PlaneTexelCtx, inkAt: InkAt): void {
  const { bounds } = desc, r = rng(SEED + desc.grain.seed), many = Math.round((DENSITY[desc.plane] * bounds.w * bounds.h) / 1000)
  const inks = new Map<number, { at: GroundInk; dark: boolean; dabs: Dab[] }>()
  for (let n = 0; n < many; n++) {
    const x = bounds.x + r() * bounds.w, y = bounds.y + r() * bounds.h, long = r(), dark = r() < DARKS, bow = r() - 0.5, wide = r(), close = r()
    const i = columnAt(t, x)
    if (y < t.crestY[i] + 2 || y > t.footY[i]) continue
    const at = inkAt(x, y), near = Math.min(CLOSE[1], Math.max(CLOSE[0], IN_MEAN + BY_LIGHT * (1 - at.light)))
    if (close > 0.25 + near) continue
    const deep = Math.min(1, (y - t.crestY[i]) / 90), len = (LONG[0] + (LONG[1] - LONG[0]) * long * long) * (0.45 + 0.55 * deep)
    const key = at.key * 2 + Number(dark)
    let ink = inks.get(key)
    if (!ink) inks.set(key, ink = { at, dark, dabs: [] })
    ink.dabs.push({ x, y, len, dy: len * slopeAt(t, i) * 0.7 * (1 - 0.6 * deep), bow, wide, deep, seed: SEED + n, cuts: Math.max(1, Math.round(HATCH * near * (0.4 + close))) })
  }
  for (const { at, dark, dabs } of inks.values()) {
    const path = brush.path()
    for (const dab of dabs) hatch(path, dab)
    brush.fill(stepped(at, dark ? DARK : LIGHT, dark ? -0.3 : 0.3), 0.55)
  }
}

/** The crest's slope over a cell, taken over a few cells each way. */
function slopeAt({ crestY, wPx }: PlaneTexelCtx, i: number): number {
  const reach = 6
  return (crestY[Math.min(wPx - 1, i + reach)] - crestY[Math.max(0, i - reach)]) / (2 * reach * TEXEL)
}

function hatch(path: CanvasPath, { x, y, len, dy, bow, wide, deep, seed, cuts }: Dab) {
  for (let k = 0; k < cuts; k++) {
    const below = y + k * BESIDE * (0.6 + 0.4 * deep)
    carve(path, [-0.5, -0.17, 0.17, 0.5].map((u): P => [x + u * len + 3 * k * bow, below + u * dy + bow * (1 - 4 * u * u)]), WIDE[0] + (WIDE[1] - WIDE[0]) * wide * deep, seed + k, 1)
  }
}
