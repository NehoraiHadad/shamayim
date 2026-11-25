import { smoothstep } from '../../../../domain/smoothstep'
import { labOf, rgbOfLab } from '../../../model/tone'
import type { PlaneTown, RGB } from '../../../model/types'
import { css, type Ctx2D } from '../../shared/base/hand'
import { fractal } from '../../shared/base/core'
import type { ReceiverBrush, ReceiverInk } from '../../shared/land/receiverBrush'
import { bodiesOf, livedOn, townExtent, townMarks, type Patch } from '../../shared/land/townGround'
import { carve, type P } from '../kit/carve'
import { traceOver } from '../kit/contour'
import { CUT_LINE } from '../kit/lines'
import { valued } from '../kit/palette'
import type { InkAt } from './groundInk'
import type { Ground } from './pots'
import { SHADE, type Shading } from './shadeBlock'

/*
 * The town's ground in the print: the lived-on land cut as two more colour blocks over the plane's (dustier and warmer at
 * each step in), in every pot's and every light block's own ink, so its shade and hatches carry on through it; then the
 * yards and gardens as small flat blocks between the houses, and a few lanes along the rows as light cuts, each as wide as
 * the houses beside it allow. No gradient: the town fades into the hillside by its blocks' wandering edges.
 */

/** The lived-on blocks: where each is cut (share of the lived-on), its step of value and how far toward dust its hue goes. */
const BLOCKS = [{ at: 0.3, by: 0.022, dust: 0.35 }, { at: 0.7, by: 0.035, dust: 0.4 }] as const
/** Dust: the hue a trodden ground turns to (Oklab a, b, a unit), its chroma its own; the values over which the hue turns in full (none in the dusk, where the ground's ink is dark). */
const DUST = { a: 0.29, b: 0.96 } as const, TURNS = [0.3, 0.62] as const
/** The grid the blocks are cut on (px a cell), and the least points a shape keeps. */
const CELL = 1, LEAST = 5
/** A yard's step of value and dust; a garden's step of value and its green (Oklab a, b). */
const YARD = { by: 0.045, dust: 0.45 } as const, GARDEN = { by: -0.05, a: -0.035, b: 0.012 } as const
/** A lane's step of value and dust; its least width (px). */
const LANE = { by: 0.07, dust: 0.4, least: 0.3 } as const
/** The value under which a step is made smaller with the block's own (as `stepped`). */
const DIM = 0.7, DIMMEST = 0.35
/** The shade block's knife edge as `printGround` cuts it, kept through the town. */
const EDGE = { wide: 0.9, dark: -0.05 } as const

/** An ink a step of value away, its hue turned `dust` of the way to a trodden ground's at its own chroma (or moved by `a`, `b`), less as the light goes. */
function dusted(rgb: RGB, by: number, dust: number, a = 0, b = 0): RGB {
  const lab = labOf(rgb), k = Math.min(1, Math.max(DIMMEST, lab.l / DIM)), chroma = Math.hypot(lab.a, lab.b)
  const turn = dust * smoothstep(TURNS[0], TURNS[1], lab.l), lit = smoothstep(TURNS[0], TURNS[1], lab.l)
  return rgbOfLab({ l: Math.min(1, Math.max(0, lab.l + by * k)),
    a: lab.a + (DUST.a * chroma - lab.a) * turn + a * lit, b: lab.b + (DUST.b * chroma - lab.b) * turn + b * lit })
}
const inked = ([lit, shade]: ReceiverInk, map: (rgb: RGB) => RGB): ReceiverInk => [map(lit), shade && map(shade)]

export function printTown(targets: readonly Ctx2D[], brush: ReceiverBrush, ground: Ground, shading: Shading, inkAt: InkAt, town: PlaneTown, seed: number): void {
  const bodies = bodiesOf(town), extent = townExtent(bodies)
  if (!extent) return
  const x = Math.floor(extent.x0), y = Math.floor(extent.y0)
  const grid = { x, y, cols: Math.ceil((extent.x1 - x) / CELL) + 1, rows: Math.ceil((extent.y1 - y) / CELL) + 1, cell: CELL }
  const lived = livedOn(bodies, grid, seed), frame = { x, y, w: (grid.cols - 1) * CELL, h: (grid.rows - 1) * CELL }
  for (const block of BLOCKS) {
    const shape = new Path2D()
    traceOver(shape, { cols: grid.cols, rows: grid.rows, at: lived }, block.at, frame, LEAST)
    overprint(targets, ground, shading, shape, (rgb) => dusted(rgb, block.by, block.dust))
  }
  const { lanes, patches } = townMarks(town)
  for (const p of patches) {
    patch(brush.path(), p)
    const at = inkAt(p.x, p.y)
    brush.fill(inked(at.ink, (rgb) => p.garden ? dusted(rgb, GARDEN.by, 0, GARDEN.a, GARDEN.b) : dusted(rgb, YARD.by, YARD.dust)), 1)
  }
  lanes.forEach((lane, k) => {
    carve(brush.path(), lane.pts, Math.min(CUT_LINE.near, Math.max(LANE.least, lane.wide)), seed + 31 * k, 0.6)
    const [mx, my] = lane.pts[lane.pts.length >> 1]
    brush.fill(inked(inkAt(mx, my).ink, (rgb) => dusted(rgb, LANE.by, LANE.dust)), 1)
  })
}

/** A block over the plane's: within `shape`, every light block and pot printed again in its own ink, mapped. */
function overprint(targets: readonly Ctx2D[], { pots }: Ground, { levels }: Shading, shape: Path2D, map: (rgb: RGB) => RGB): void {
  targets.forEach((ctx, k) => levels.forEach((level, v) => {
    if (!level) return
    ctx.save()
    ctx.clip(shape)
    if (level.path) ctx.clip(level.path)
    pots.forEach(({ shapes }, p) => {
      ctx.fillStyle = css(map(level.inks[k][p]))
      if (p) ctx.fill(shapes)
      else ctx.fill(shape)
    })
    if (v === SHADE && level.path && level.shown[k] > 0.05) {
      ctx.strokeStyle = css(valued(map(level.inks[k][0]), EDGE.dark), 0.8 * level.shown[k])
      ctx.lineWidth = EDGE.wide
      ctx.lineJoin = 'round'
      ctx.stroke(level.path)
    }
    ctx.restore()
  }))
}

/** A yard's or a garden's block: a low knife-cut patch, its sides wandering, lying along the slope. */
function patch(path: CanvasPath, { x, y, rx, ry, seed }: Patch) {
  const n = 9, pts: P[] = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * 2 * Math.PI, wander = 0.78 + 0.4 * fractal(seed, Math.cos(a) * 3, Math.sin(a) * 3, 0.5, 0.5, 1)
    return [x + Math.cos(a) * rx * wander, y + Math.sin(a) * ry * wander]
  })
  pts.forEach(([px, py], k) => (k ? path.lineTo(px, py) : path.moveTo(px, py)))
  path.closePath()
}
