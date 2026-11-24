import { hashId } from '../../../data/landmarks/hash'
import type { LayerOf, RGB } from '../../model/types'
import { throughAir } from '../shared/cloud/throughAir'
import { css, type Ctx2D, type PaintEnv, type Scratch } from '../shared/base/hand'
import { capTop, paintCap, traceCap } from './cloudCaps'
import { capInks, printed } from './cloudInks'
import { traceOver } from './kit/contour'
import { sheetCaps } from './sheetCaps'
import { cutOf, nearAt, type Cut, type Eased } from './sheetEdge'
import { fieldAt, type SheetField } from './sheetField'
import { sheetLight } from './sheetLight'

/*
 * A broken sheet as a print: the model's cloud as one block with capped edges, its light wiped over the whole of it, each cap
 * lit on its top, inside a key line. Where the cloud is, how much of it and every tone are the model's. Pure: the desc and
 * the scratch surfaces from `env`.
 */

type Sheet = LayerOf<'cloudSheet'>

/** The px of its sheet at most, and the block's opacity over its thin and its thick cloud. */
const SHEET_PX = 700_000, THIN = 0.72, THICK = 0.95
/** Sky px per cell of its light, and how far (px) out from the edge that is laid: over what its caps reach. */
const WASH = 6, REACH = 30
/** The key line (px, half of it under the block), its strength, and what of it a far cloud keeps. */
const LINE = 1.1, STRONG = 0.5, FAR = 0.15
/** The steps of the key line's fade down the sky. */
const STEPS = 12

export function printSheet(ctx: Ctx2D, desc: Sheet, read: Eased, env: PaintEnv): void {
  const { f } = read, frame = { x: f.x0, y: f.y0, w: f.width, h: f.height }, seed = hashId(desc.id)
  const cut = cutOf(read, seed)
  if (!cut.edge.at.some((v) => v > 0)) return
  const light = sheetLight(desc, read), { t } = light, { wash, mask } = blockOf(desc, read, cut, light, env)
  const caps = sheetCaps(desc, read, cut, seed), tops = caps.map(capTop), path = new Path2D()
  traceOver(path, cut.edge, 0, frame)
  caps.forEach((cap, i) => traceCap(path, cap, tops[i]))
  const k = Math.min(env.scale, Math.sqrt(SHEET_PX / (f.width * f.height))), w = Math.ceil(f.width * k), h = Math.ceil(f.height * k), { canvas, ctx: c } = env.canvas(w, h)
  const over = (image: Scratch['canvas']) => c.drawImage(image, 0.5, 0.5, image.width - 1, image.height - 1, f.x0, f.y0, f.width, f.height)
  c.save()
  c.scale(k, k)
  c.translate(-f.x0, -f.y0)
  c.fillStyle = css(t.half)
  c.fill(path)
  c.globalCompositeOperation = 'source-atop'
  over(wash)
  caps.forEach((cap, i) => {
    const ink = capInks(t, light.at(cap.gx, cap.gy, cap.side), light.crest), under = (rgb: RGB) => light.under(rgb, cap.gx, cap.gy)
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

/** The key line's ink down the sky. */
function keyOf(c: Ctx2D, f: SheetField, ink: (near: number) => string) {
  const down = c.createLinearGradient(0, f.y0, 0, f.y0 + f.height)
  for (let n = 0; n <= STEPS; n++) down.addColorStop(n / STEPS, ink(nearAt(f, (n / STEPS) * (f.rows - 1))))
  return down
}

/** The block's one printing of ink, and how opaque it lies at each place, as far out as its caps may reach. */
function blockOf(desc: Sheet, { f, alpha }: Eased, { inside, sideAt }: Cut, { at, under, t }: ReturnType<typeof sheetLight>, env: PaintEnv) {
  const cols = Math.ceil(f.width / WASH) + 1, rows = Math.ceil(f.height / WASH) + 1
  const ink = env.canvas(cols, rows), opaque = env.canvas(cols, rows), inks = ink.ctx.createImageData(cols, rows), left = opaque.ctx.createImageData(cols, rows)
  for (let j = 0; j < rows; j++) {
    const v = j / (rows - 1), gy = v * (f.rows - 1), y = f.y0 + v * f.height
    for (let i = 0; i < cols; i++) {
      const u = i / (cols - 1), gx = u * (f.cols - 1), x = f.x0 + u * f.width, n = (j * cols + i) * 4
      if (inside(x, y) < -REACH) continue
      const rgb = under(printed(t, at(gx, gy, sideAt(x, y))), gx, gy)
      for (let m = 0; m < 3; m++) inks.data[n + m] = Math.round(rgb[m] * 255)
      inks.data[n + 3] = 255
      left.data[n + 3] = Math.round(255 * (THIN + (THICK - THIN) * Math.min(1, fieldAt(alpha, f.cols, f.rows, gx, gy))))
    }
  }
  throughAir(left.data, cols, rows, desc)
  ink.ctx.putImageData(inks, 0, 0)
  opaque.ctx.putImageData(left, 0, 0)
  return { wash: ink.canvas, mask: opaque.canvas }
}
