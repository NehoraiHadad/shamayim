import { hashId } from '../../../data/landmarks/hash'
import { rowValues } from '../../model/rowValues'
import type { LayerOf, RGB } from '../../model/types'
import { carryDown, rowsBelow } from '../shared/cloud/belowEye'
import { css, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { capTop, paintCap, traceCap, traceTop } from './cloudCaps'
import { capInks, printed } from './cloudInks'
import { traceOver, type Frame, type Grid } from './kit/contour'
import { sheetCaps } from './sheetCaps'
import { cutOf, nearAt, type Cut, type Eased } from './sheetEdge'
import { fieldAt, type SheetField } from './sheetField'
import { sheetLight, type SheetLight } from './sheetLight'

/*
 * A broken sheet as a print: the model's cloud as one block with capped edges, its light wiped over the whole of it, each cap
 * lit on its top, inside a key line. Where the cloud is, how much of it and every tone are the model's. Pure: the desc and
 * the scratch surface from `env`.
 */

type Sheet = LayerOf<'cloudSheet'>
/** How opaque the print lies at a place of the field's grid, the air before it counted. */
type Opaque = (gx: number, gy: number) => number

/** The print's opacity over its thin and its thick cloud. */
const THIN = 0.72, THICK = 0.95
/** Sky px per cell of its light, and how far (px) out from the edge that is laid: over what its caps reach. */
const WASH = 6, REACH = 30
/** The key line (px, half of it behind the block), its strength, and what of it a far cloud keeps. */
const LINE = 1.1, STRONG = 0.5, FAR = 0.15
/** How far in (of its size) a cap no longer reaches over the edge. */
const OUTER = 1.4
/** The steps of the key line's fade down the sky. */
const STEPS = 12

export function printSheet(ctx: Ctx2D, desc: Sheet, read: Eased, env: PaintEnv): void {
  const { f } = read, seed = hashId(desc.id)
  const cut = cutOf(read, seed)
  if (!cut.edge.at.some((v) => v > 0)) return
  const light = sheetLight(desc, read), { t } = light, caps = sheetCaps(desc, read, cut, seed), tops = caps.map(capTop), key = new Path2D()
  const air = desc.through ? rowValues(desc.ys, desc.through, 1) : () => 1
  const opaque: Opaque = (gx, gy) => air(f.y0 + (gy / (f.rows - 1)) * f.height) * (THIN + (THICK - THIN) * Math.min(1, fieldAt(read.alpha, f.cols, f.rows, gx, gy)))
  const { grid, frame } = outline(f, cut.edge, desc.below)
  traceOver(key, grid, 0, frame)
  const block = new Path2D(key)
  caps.forEach((cap, i) => {
    if (cut.inside(cap.x, cap.y) > OUTER * cap.r) return
    traceCap(block, cap, tops[i])
    traceTop(key, tops[i])
  })
  ctx.save()
  ctx.strokeStyle = keyOf(ctx, f, (near, y) => css(t.key, THICK * air(y) * STRONG * t.line * (FAR + (1 - FAR) * near)))
  ctx.lineWidth = LINE
  ctx.stroke(key)
  const wash = blockOf(read, cut, light, opaque, env, desc.below), ink = ctx.createPattern(wash as CanvasImageSource, 'no-repeat')
  if (ink) {
    const a = f.width / (wash.width - 1), d = f.height / (washRows(f) - 1)
    ink.setTransform({ a, d, e: f.x0 - 0.5 * a, f: f.y0 - 0.5 * d })
    ctx.fillStyle = ink
    ctx.fill(block)
  }
  const alpha = ctx.globalAlpha
  caps.forEach((cap, i) => {
    const inks = capInks(t, light.at(cap.gx, cap.gy, cap.side), light.crest), under = (rgb: RGB) => light.under(rgb, cap.gx, cap.gy)
    ctx.globalAlpha = alpha * opaque(cap.gx, cap.gy)
    paintCap(ctx, cap, tops[i], { lit: under(inks.lit), local: under(inks.local), shade: under(inks.shade), key: inks.key }, t.line * nearAt(f, cap.gy))
  })
  ctx.restore()
}

/** The cut's grid and where it lies, gone on `below` px under eye level as it is there. */
function outline(f: SheetField, edge: Grid, below?: number): { grid: Grid; frame: Frame } {
  const { cols, rows } = edge, more = rowsBelow(below, f.height, rows), frame = { x: f.x0, y: f.y0, w: f.width, h: f.height + (more * f.height) / (rows - 1) }
  if (!more) return { grid: edge, frame }
  const at = new Float32Array(cols * (rows + more))
  at.set(edge.at)
  carryDown(at, cols, rows, more)
  return { grid: { cols, rows: rows + more, at }, frame }
}

const washRows = (f: SheetField) => Math.ceil(f.height / WASH) + 1

/** The key line's ink down the sky. */
function keyOf(ctx: Ctx2D, f: SheetField, ink: (near: number, y: number) => string) {
  const down = ctx.createLinearGradient(0, f.y0, 0, f.y0 + f.height)
  for (let n = 0; n <= STEPS; n++) down.addColorStop(n / STEPS, ink(nearAt(f, (n / STEPS) * (f.rows - 1)), f.y0 + (n / STEPS) * f.height))
  return down
}

/** The block's one printing of ink, as opaque as it lies at each place, as far out as its caps may reach, and `below` px on. */
function blockOf({ f }: Eased, { inside, sideAt }: Cut, { at, under, t }: SheetLight, opaque: Opaque, env: PaintEnv, below?: number) {
  const cols = Math.ceil(f.width / WASH) + 1, rows = washRows(f), more = rowsBelow(below, f.height, rows)
  const { canvas, ctx } = env.canvas(cols, rows + more), image = ctx.createImageData(cols, rows + more)
  for (let j = 0; j < rows; j++) {
    const v = j / (rows - 1), gy = v * (f.rows - 1), y = f.y0 + v * f.height
    for (let i = 0; i < cols; i++) {
      const u = i / (cols - 1), gx = u * (f.cols - 1), x = f.x0 + u * f.width, n = (j * cols + i) * 4
      if (inside(x, y) < -REACH) continue
      const rgb = under(printed(t, at(gx, gy, sideAt(x, y))), gx, gy)
      for (let m = 0; m < 3; m++) image.data[n + m] = Math.round(rgb[m] * 255)
      image.data[n + 3] = Math.round(255 * opaque(gx, gy))
    }
  }
  carryDown(image.data, cols * 4, rows, more)
  ctx.putImageData(image, 0, 0)
  return canvas
}
