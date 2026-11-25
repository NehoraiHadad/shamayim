import type { LayerOf } from '../../../model/types'
import type { ReceiverBrush, ReceiverInk } from '../../shared/land/receiverBrush'
import { mapInk } from '../../shared/land/receiverBrush'
import { townMarks } from '../../shared/land/townGround'
import { carve, type P } from '../kit/carve'
import { KEY_STEP, LINE } from '../kit/lines'
import { SEAT_STRIDE, type PlaneSeats } from '../townSeats'
import { stepped, type InkAt } from './groundInk'
import { dusted, LIVED_ON } from './settlement'

/*
 * The town's seats and casts cut in the near plane's own wood: every body the town paints (`townSeats`) stands in a block
 * of the ground's shade step under its walls, and in the sun its cast runs off along the ground away from the light (and
 * toward the eye, where the sun is behind the town), each in the ink of the ground it falls on, a step darker, knife-edged:
 * the house sits in its ground, not on a band of its own. Under each front row the ground's key line is carved through,
 * one continuous cut broken where a path leaves the row. The houses are printed over all of it. Pure: the plane's desc.
 */

/** The seat's depth under the foot (px), how far it tucks up under the walls (px); its ink's step of value. */
const SEAT = 1.2, TUCK = 0.25, STEP = -0.1
/** The cast: its least strength to be cut, the longest one (px), its reach against the body's height, the share of its
 *  depth left at its tip, how far it starts in under the body (px). */
const CAST_LEAST = 0.08, REACH_MOST = 14, REACH = 0.6, TIP = 0.4, INSET = 0.3
/** A cast toward the eye: its depth against the body's height and its share toward the eye, and its deepest (px). */
const TOWARD = 0.35, TOWARD_MOST = 3
/** The ground's line under a front row: how strongly printed (the land's crest key's), how far either side of a path it breaks (px). */
const LINE_ALPHA = 0.8, BREAK = 0.35, SEED = 6203

export function printSeats(brush: ReceiverBrush, desc: LayerOf<'plane'>, inkAt: InkAt): void {
  const own = desc.own as PlaneSeats | undefined
  if (!own?.seats || !desc.town) return
  const [dx, length, alpha, toward = 0] = own.cast, cast = alpha >= CAST_LEAST && Math.abs(dx) > 0.02
  // The ground a seat is cut in: the lived-on block's ink there, a step down.
  const shadeOf = (x: number, y: number) => {
    const at = inkAt(x, y)
    return { key: at.key, ink: stepped({ ...at, ink: mapInk(at.ink, (rgb) => dusted(rgb, LIVED_ON.by, LIVED_ON.dust)) }, STEP) }
  }
  const byInk = new Map<number, { ink: ReceiverInk; shapes: P[][] }>()
  const { seats } = own
  for (let o = 0; o + SEAT_STRIDE <= seats.length; o += SEAT_STRIDE) {
    const [x0, x1, l, r, h] = seats.slice(o, o + SEAT_STRIDE), w = Math.max(1e-3, x1 - x0)
    const slope = (r - l) / w, y = (x: number) => l + (x - x0) * slope
    const front = toward > 0 ? Math.min(TOWARD_MOST, length * h * toward * TOWARD) : 0, deep = Math.max(SEAT, front)
    const reach = cast ? Math.min(REACH_MOST, length * h * REACH * Math.min(1, Math.abs(dx) * 1.6)) : 0
    const shape: P[] = []
    if (reach <= 0.5) {
      // The seat alone: the ground's shade under the walls (deeper toward the eye where the sun is behind them).
      shape.push([x0, y(x0) - TUCK], [x1, y(x1) - TUCK], [x1, y(x1) + deep], [x0, y(x0) + deep])
    } else {
      // The seat and the cast as one block: from under the body along the ground, its tip cut on the chisel's slant.
      const dir = Math.sign(dx), under = dir > 0 ? x0 : x1, back = (x0 + x1) / 2 - dir * (w / 2 - INSET), tip = (x0 + x1) / 2 + dir * (w / 2 + reach)
      shape.push([under, y(under) - TUCK], [tip, y(tip) - TUCK], [tip - dir * Math.min(reach, 1.2), y(tip) + SEAT * TIP],
        [dir > 0 ? x1 : x0, y(dir > 0 ? x1 : x0) + SEAT], [back, y(back) + deep], [under, y(under) + deep])
    }
    const { key, ink } = shadeOf((x0 + x1) / 2, y((x0 + x1) / 2) + SEAT / 2)
    let group = byInk.get(key)
    if (!group) byInk.set(key, group = { ink, shapes: [] })
    group.shapes.push(shape)
  }
  for (const { ink, shapes } of byInk.values()) {
    const path = brush.path()
    for (const shape of shapes) shape.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y)))
    brush.fill(ink, 1)
  }
  groundLines(brush, desc, own.rows, inkAt)
}

/** The ground's key line under each front row, the land's own carve, broken where a path leaves the row. */
function groundLines(brush: ReceiverBrush, desc: LayerOf<'plane'>, rows: readonly (readonly number[])[], inkAt: InkAt) {
  const paths = townMarks(desc.town!).lanes.filter((lane) => !lane.lane).map((lane) => [lane.pts[0][0], lane.wide / 2 + BREAK] as const)
  const half = LINE.far / 2
  rows.forEach((row, n) => {
    // The row's line a point every px or so, so a path between two houses finds it.
    const pts: P[] = []
    for (let k = 0; k + 1 < row.length; k += 2) {
      const x = row[k], y = row[k + 1] + half - TUCK, last = pts.at(-1)
      const n = last ? Math.max(1, Math.ceil(x - last[0])) : 1
      for (let m = 1; m <= n; m++) pts.push(last ? [last[0] + ((x - last[0]) * m) / n, last[1] + ((y - last[1]) * m) / n] : [x, y])
    }
    // Cut the row where a path leaves it.
    const runs: P[][] = [[]]
    for (let k = 0; k < pts.length; k++) {
      const [x] = pts[k], cut = paths.find(([px, d]) => Math.abs(px - x) < d)
      if (cut) { if (runs.at(-1)!.length) runs.push([]); continue }
      runs.at(-1)!.push(pts[k])
    }
    runs.forEach((run, m) => {
      if (run.length < 2) return
      const mid = run[run.length >> 1]
      carve(brush.path(), run, LINE.far, SEED + n * 31 + m, 0)
      brush.fill(stepped(inkAt(mid[0], mid[1] + 1), KEY_STEP.far), LINE_ALPHA)
    })
  })
}
