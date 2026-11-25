import { TEXEL } from '../../../model/planeBands'
import { labOf, toSrgb } from '../../../model/tone'
import type { LayerOf, RGB } from '../../../model/types'
import { smoothstep } from '../../../../domain/smoothstep'
import { displace, fractal, rng, sample, tube } from '../../shared/base/core'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'
import type { ReceiverBrush } from '../../shared/land/receiverBrush'
import { carve, type P } from '../kit/carve'
import { CUT_LINE } from '../kit/lines'
import { cellAt, columnAt, type Ground } from './pots'
import { SHADE } from './shadeBlock'
import { stepped, type GroundInk, type InkAt } from './groundInk'

/* The hand's marks on the ground: the gullies, terraces and fields the model gives as clean cuts, and the graver's cuts along the slope. */

/** A clean cut's value from the ground's. */
const CUT = -0.24, SEED = 5501

export function groundLines(brush: ReceiverBrush, desc: LayerOf<'plane'>, inkAt: InkAt): void {
  const cut = ([x, y]: readonly [number, number]) => stepped(inkAt(x, y), CUT)

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
const FIELD = { wide: 0.6, dark: -0.12, alpha: 0.7, stride: 9 } as const

/** The fields the model gives, each inside a thin carved edge. */
export function groundFields(brush: ReceiverBrush, fields: Float32Array, inkAt: InkAt): void {
  for (let o = 0; o + FIELD.stride <= fields.length; o += FIELD.stride) {
    const at = [0, 1, 2, 3, 0].map((k): P => [fields[o + k * 2], fields[o + k * 2 + 1]])
    carve(brush.path(), at, FIELD.wide, SEED + o, 0)
    brush.fill(stepped(inkAt((at[0][0] + at[2][0]) / 2, (at[0][1] + at[2][1]) / 2), FIELD.dark), FIELD.alpha * fields[o + 8])
  }
}

/** Hatches a plane takes per 1000 px² of its shade block; a cut's length (px) at the foot, its spread of width; how much darker than the block. */
const HATCH = { near: 30, far: 10, back: 0 } as const
const LONG = [4, 16] as const, WIDE = [0.75, 1.1] as const, DARK = -0.11
/** Cuts a hatch holds at most, the px between them at the foot; how far along the crest the contour is read (cells). */
const CUTS = 4, BESIDE = 1.7, REACH = 12
/** How far inside the shade block a hatch's centre line keeps (px). */
const IN = 1.5

/**
 * The land cover's marks: clumps per 1000 px² at their densest (at the foot), the marks a clump holds at most, its reach
 * (px at the foot); a mark's size at the foot (px), how much darker than its block.
 */
const COVER = { near: 24, far: 0, back: 0 } as const, CLUMP = 6, REACH_CLUMP = 7, MARK = 1.3, MARK_DARK = -0.13
/** The drifts the marks lie in: a slow noise's scale (px at the foot, across and down) and the band of it they thin over. */
const DRIFT = { across: 70, down: 26, from: 0.46, to: 0.58 } as const
/** A pot's greenness (Oklab -a) that makes it all scrub, and the share of marks on bare ground; marks off the snow. */
const GREEN = 0.035, BARE = 0.3, SNOW = 0.86

interface Dab { x: number; y: number; len: number; dy: number; bow: number; wide: number; deep: number; seed: number; cuts: number }

/**
 * The graver's hand on the ground: hatches cut only in the shade blocks, along the hillside's contour, shorter, closer and
 * thinner uphill where the land lies farther; and the land cover's own small marks (scrub dots, tufts on the near slopes),
 * as many as the pot is green and smaller with distance. One fill an ink.
 */
export function groundDabs(brush: ReceiverBrush, desc: LayerOf<'plane'>, t: PlaneTexelCtx, ground: Ground, inkAt: InkAt): void {
  const tier = desc.plane, { bounds } = desc, r = rng(SEED + desc.grain.seed), area = bounds.w * bounds.h
  const inks = new Map<number, { at: GroundInk; dabs: Dab[] }>()
  for (let n = 0, many = Math.round((HATCH[tier] * area) / 1000); n < many; n++) {
    const x = bounds.x + r() * bounds.w, y = bounds.y + r() * bounds.h, long = r(), bow = r() - 0.5, wide = r(), close = r()
    const i = columnAt(t, x), deep = depthAt(t, i, y)
    if (deep === null || y < t.crestY[i] + 2) continue
    const at = inkAt(x, y)
    if (at.level !== SHADE || close > (0.35 + 0.65 * deep) * at.shown) continue
    const len = (LONG[0] + (LONG[1] - LONG[0]) * long * long) * (0.4 + 0.6 * deep)
    let ink = inks.get(at.key)
    if (!ink) inks.set(at.key, ink = { at, dabs: [] })
    const wideness = CUT_LINE[tier] * (WIDE[0] + (WIDE[1] - WIDE[0]) * wide) * (0.55 + 0.45 * deep)
    ink.dabs.push({ x, y, len, dy: len * slopeAt(t, i) * (1 - 0.75 * deep), bow, wide: wideness, deep, seed: SEED + n, cuts: 1 + Math.floor(close * CUTS) })
  }
  // A cut stands wholly inside its block, every point of its centre line at least `IN` px from the block's edge.
  const fits = (x: number, y: number, wide: number) => (inkAt(x, y).inside ?? 0) >= IN + wide / 2
  for (const { at, dabs } of inks.values()) {
    const path = brush.path()
    for (const dab of dabs) hatch(path, dab, fits)
    brush.fill(stepped(at, DARK), 0.85)
  }
  cover(brush, desc, t, ground, inkAt)
}

/** How far down the plane a place lies at its column, 0 at the crest … 1 at the foot; none off the land. */
function depthAt(t: PlaneTexelCtx, i: number, y: number): number | null {
  if (y < t.crestY[i] || y > t.footY[i]) return null
  return Math.min(1, (y - t.crestY[i]) / Math.max(1, t.footY[i] - t.crestY[i]))
}

/** The crest's slope over a cell, taken over a stretch each way: the hillside's contour runs with it under the crest. */
function slopeAt({ crestY, wPx }: PlaneTexelCtx, i: number): number {
  return (crestY[Math.min(wPx - 1, i + REACH)] - crestY[Math.max(0, i - REACH)]) / (2 * REACH * TEXEL)
}

/** A hatch's cuts, each shortened to stay inside its block (or left out, if half of it would not). */
function hatch(path: CanvasPath, { x, y, len, dy, bow, wide, deep, seed, cuts }: Dab, fits: (x: number, y: number, wide: number) => boolean) {
  for (let k = 0; k < cuts; k++) {
    const below = y + k * BESIDE * (0.5 + 0.5 * deep)
    for (const short of [1 - 0.18 * k, 0.5 - 0.09 * k]) {
      const pts = [-0.5, -0.17, 0.17, 0.5].map((u): P => [x + u * len * short + 1.5 * k * bow, below + u * dy * short + bow * 0.6 * (1 - 4 * u * u)])
      if (!pts.every(([px, py]) => fits(px, py, wide))) continue
      carve(path, pts, wide, seed + k, 0)
      break
    }
  }
}

/**
 * The land cover's marks, laid as a hand lays them: in drifts with bare ground between, a few clumps in each, thinning to
 * nothing toward a pot's edge (the cover changes there) and smaller and closer uphill. Four authored forms: a tuft of three
 * blades, a leaning pair, a low scrub cushion, a clod's dash; the greener the pot, the more blades.
 */
function cover(brush: ReceiverBrush, desc: LayerOf<'plane'>, t: PlaneTexelCtx, ground: Ground, inkAt: InkAt) {
  const most = COVER[desc.plane], { bounds } = desc, seed = desc.grain.seed
  if (!most) return
  const green = ground.pots.map(({ rho }) => {
    const lab = labOf(rho.map(toSrgb) as unknown as RGB)
    return lab.l > SNOW ? 0 : BARE + (1 - BARE) * Math.min(1, Math.max(0, -lab.a / GREEN))
  })
  const r = rng(SEED * 3 + seed), inks = new Map<number, { at: GroundInk; marks: ((path: CanvasPath) => void)[] }>()
  for (let n = 0, many = Math.round((most * bounds.w * bounds.h) / 1000); n < many; n++) {
    const cx = bounds.x + r() * bounds.w, cy = bounds.y + r() * bounds.h, keep = r(), count = r(), reach = r()
    const ci = columnAt(t, cx), cdeep = depthAt(t, ci, cy)
    if (cdeep === null || cy < t.crestY[ci] + 3) continue
    // Uphill the land lies farther: its drifts are smaller on the picture.
    const far = 0.35 + 0.65 * cdeep, drift = fractal(SEED + seed, cx, cy, 1 / (DRIFT.across * far), 1 / (DRIFT.down * far), 2)
    const p0 = ground.label[cellAt(t, cx, cy)]
    if (keep > green[p0] * smoothstep(DRIFT.from, DRIFT.to, drift) * (0.55 + 0.45 * cdeep) * edgeOf(t, ground, cx, cy)) continue
    for (let k = 0, held = 1 + Math.floor(count * CLUMP); k < held; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * REACH_CLUMP * far * (0.5 + reach), size = r(), lean = r() - 0.5, form = r()
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.45, i = columnAt(t, x), deep = depthAt(t, i, y)
      if (deep === null || y < t.crestY[i] + 3 || ground.label[cellAt(t, x, y)] !== p0) continue
      const at = inkAt(x, y)
      let ink = inks.get(at.key)
      if (!ink) inks.set(at.key, ink = { at, marks: [] })
      const s = MARK * (0.35 + 0.65 * deep) * (0.7 + 0.6 * size), g = green[p0], mark = SEED + n * 7 + k
      // The greener the pot, the more its marks are blades; the nearer, the more blades a tuft can show.
      const kind = form < g * 0.55 && deep > 0.45 ? 0 : form < g * 0.85 ? 1 : form < 0.5 + 0.5 * g ? 2 : 3
      ink.marks.push((path) => FORMS[kind](path, x, y, s, lean, mark))
    }
  }
  for (const { at, marks } of inks.values()) {
    const path = brush.path()
    for (const mark of marks) mark(path)
    brush.fill(stepped(at, MARK_DARK), 0.8)
  }
}

/** How far a place stands from its pot's edge: the share of the ground about it (2 and 4 cells off) in the same pot, eased. */
function edgeOf(t: PlaneTexelCtx, { label }: Ground, x: number, y: number): number {
  const own = label[cellAt(t, x, y)]
  let same = 0
  for (const d of [2, 4]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (label[cellAt(t, x + dx * d * TEXEL, y + dy * d * TEXEL * 0.6)] === own) same++
  return smoothstep(0.45, 1, same / 8)
}

type Form = (path: CanvasPath, x: number, y: number, s: number, lean: number, seed: number) => void
/** The authored marks, each cut from its foot at (x, y), `s` px high. */
const FORMS: readonly Form[] = [
  // A tuft: three blades fanned from one foot, the middle the tallest.
  (path, x, y, s, lean, seed) => { for (const fan of [-0.6, 0, 0.6]) carve(path, [[x + fan * s * 0.5, y], [x + fan * s * 1.1 + lean * s * 0.4, y - s * (1.3 - 0.3 * Math.abs(fan))]], s * 0.32, seed, 0) },
  // A leaning pair: two blades of unequal height, both bent the way the wind took them.
  (path, x, y, s, lean, seed) => {
    const by = lean < 0 ? -1 : 1
    carve(path, [[x, y], [x + by * s * 0.25, y - s * 0.6], [x + by * s * 0.6, y - s * 1.15]], s * 0.3, seed, 0)
    carve(path, [[x + s * 0.3, y], [x + s * 0.3 + by * s * 0.4, y - s * 0.75]], s * 0.28, seed + 1, 0)
  },
  // A scrub cushion: a low, flat-topped knot, wider than high.
  (path, x, y, s, lean, seed) => carve(path, [[x - s * 0.7, y], [x - s * 0.35, y - s * 0.5], [x + s * 0.35, y - s * (0.5 + lean * 0.2)], [x + s * 0.7, y]], s * 0.45, seed, 0),
  // A clod or a stone: one short cut along the slope.
  (path, x, y, s, lean, seed) => carve(path, [[x - s * 0.45, y + lean * s * 0.2], [x + s * 0.45, y - lean * s * 0.2]], s * 0.62, seed, 0),
]
