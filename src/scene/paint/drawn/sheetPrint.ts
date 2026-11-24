import { hashId } from '../../../data/landmarks/hash'
import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf, RGB } from '../../model/types'
import { throughAir } from '../shared/cloud/throughAir'
import { css, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { capTop, paintCap, traceCap } from './cloudCaps'
import { capInks, printed } from './cloudInks'
import { ease } from './kit/ease'
import { traceOver, type Grid } from './kit/contour'
import { sheetCaps, type CapField } from './sheetCaps'
import { fieldAt, type SheetField } from './sheetField'
import { sheetLight } from './sheetLight'

/*
 * A broken sheet as a print: the model's cloud as one block with capped edges, its light wiped over the whole of it, each cap
 * lit on its top, inside a key line. Where the cloud is, how much of it and every tone are the model's. Pure: the desc and
 * the scratch surfaces from `env`.
 */

type Sheet = LayerOf<'cloudSheet'>

/** Sky px per grid cell; the px of its sheet at most; the alpha its edge is cut at. */
const CELL = 2.5, SHEET_PX = 1_300_000, EDGE = 0.36
/** How far the model's rows are eased into each other (against their spacing), and wider, for what is round a place. */
const EASED = 0.2, WIDE = 1.6
/** A row this far apart (px) is near; how much a far cloud is cut back from the next, from this far off its middle. */
const NEAR = 14, PARTED = 0.5, MIDDLE = 0.45
/** The block's opacity over its thin and its thick cloud, and the alpha it is all there from. */
const THIN = 0.72, THICK = 0.95, THERE = 0.1
/** The key line (px, half of it under the block), its strength, and what of it a far cloud keeps. */
const LINE = 1.1, STRONG = 0.5, FAR = 0.35
/** The steps of the key line's fade down the sky. */
const STEPS = 12

/** The sheet's eased cloud, for its edge and its caps. */
export function printField(f: SheetField): CapField {
  const alpha = Float32Array.from(f.alpha), wide = Float32Array.from(f.alpha), colPx = f.width / (f.cols - 1), rowPx = f.height / (f.rows - 1)
  for (const [grid, by] of [[alpha, EASED], [wide, WIDE]] as const) ease(grid, f.cols, f.rows, f.spacing.map((s) => (1.4 * by * s) / colPx), f.spacing.map((s) => (by * s) / rowPx))
  return { f, alpha, wide, edge: EDGE }
}

export function printSheet(ctx: Ctx2D, desc: Sheet, read: CapField, env: PaintEnv): void {
  const { f } = read, frame = { x: f.x0, y: f.y0, w: f.width, h: f.height }, seed = hashId(desc.id)
  const light = sheetLight(desc, read), { t } = light, { edge, wash, mask } = blockOf(desc, read, light, env)
  const caps = sheetCaps(desc, read, seed), tops = caps.map(capTop), path = new Path2D()
  traceOver(path, edge, 0, frame)
  caps.forEach((cap, i) => traceCap(path, cap, tops[i]))
  const k = Math.min(env.scale, Math.sqrt(SHEET_PX / (f.width * f.height))), w = Math.ceil(f.width * k), h = Math.ceil(f.height * k), { canvas, ctx: c } = env.canvas(w, h)
  const over = (image: CanvasImageSource) => c.drawImage(image, 0.5, 0.5, edge.cols - 1, edge.rows - 1, f.x0, f.y0, f.width, f.height)
  c.save()
  c.scale(k, k)
  c.translate(-f.x0, -f.y0)
  c.imageSmoothingQuality = 'high'
  c.fillStyle = css(t.half)
  c.fill(path)
  c.globalCompositeOperation = 'source-atop'
  over(wash)
  caps.forEach((cap, i) => {
    const ink = capInks(t, light.at(cap.gx, cap.gy)), under = (rgb: RGB) => light.under(rgb, cap.gx, cap.gy)
    paintCap(c, cap, tops[i], { lit: under(ink.lit), local: under(ink.local), shade: under(ink.shade), key: ink.key }, t.line * nearAt(f, cap.gy))
  })
  c.globalCompositeOperation = 'destination-over'
  c.strokeStyle = keyOf(c, f, (near) => css(t.key, STRONG * t.line * (FAR + (1 - FAR) * near)))
  c.lineWidth = LINE
  c.stroke(path)
  c.globalCompositeOperation = 'destination-in'
  over(mask)
  c.restore()
  ctx.drawImage(canvas, f.x0, f.y0, w / k, h / k)
}

/** How near a row is (0 far … 1). */
const nearAt = (f: SheetField, gy: number) => Math.min(1, f.spacing[Math.min(f.rows - 1, Math.max(0, Math.round(gy)))] / NEAR)

/** The key line's ink down the sky. */
function keyOf(c: Ctx2D, f: SheetField, ink: (near: number) => string) {
  const down = c.createLinearGradient(0, f.y0, 0, f.y0 + f.height)
  for (let n = 0; n <= STEPS; n++) down.addColorStop(n / STEPS, ink(nearAt(f, (n / STEPS) * (f.rows - 1))))
  return down
}

/** The block's edge on a grid (over 0 inside), its one printing of ink, and how opaque it lies at each place. */
function blockOf(desc: Sheet, { f, alpha }: CapField, { at, under, t }: ReturnType<typeof sheetLight>, env: PaintEnv) {
  const cols = Math.ceil(f.width / CELL) + 1, rows = Math.ceil(f.height / CELL) + 1, edge: Grid = { cols, rows, at: new Float32Array(cols * rows) }
  const ink = env.canvas(cols, rows), opaque = env.canvas(cols, rows), inks = ink.ctx.createImageData(cols, rows), left = opaque.ctx.createImageData(cols, rows)
  for (let j = 0, n = 0; j < rows; j++) {
    const gy = (j * (f.rows - 1)) / (rows - 1), parted = PARTED * (1 - nearAt(f, gy))
    for (let i = 0; i < cols; i++, n++) {
      const gx = (i * (f.cols - 1)) / (cols - 1), a = fieldAt(alpha, f.cols, f.rows, gx, gy)
      edge.at[n] = a - EDGE - parted * Math.max(0, Math.abs(fieldAt(f.side, f.cols, f.rows, gx, gy)) - MIDDLE)
      left.data[n * 4 + 3] = Math.round(255 * smoothstep(0, THERE, a) * (THIN + (THICK - THIN) * Math.min(1, a)))
      const rgb = under(printed(t, at(gx, gy)), gx, gy)
      for (let m = 0; m < 3; m++) inks.data[n * 4 + m] = Math.round(rgb[m] * 255)
      inks.data[n * 4 + 3] = 255
    }
  }
  throughAir(left.data, cols, rows, desc)
  ink.ctx.putImageData(inks, 0, 0)
  opaque.ctx.putImageData(left, 0, 0)
  return { edge, wash: ink.canvas, mask: opaque.canvas }
}
