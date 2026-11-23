import { hashId } from '../../../../src/data/landmarks/hash'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { addLight } from '../../../../src/scene/model/tone'
import { toneOf } from '../../../../src/scene/paint/shared/cloud/deck'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { billows } from '../../../../src/scene/paint/drawn/billows'
import { lowLight, whitened } from '../../../../src/scene/paint/drawn/cloudLight'
import { soften } from '../../../../src/scene/paint/shared/base/soften'
import { fieldAt, sheetField, type SheetField } from '../../../../src/scene/paint/drawn/sheetField'
import { traceOver, type Frame, type Grid } from './contour'
import { pigment } from './palette'

/*
 * A cloud sheet as cut paper: each mass is one flat shade plane with a scalloped head and a calm foot, a local plane over
 * it and a lit plane on its tops, every edge a closed outline (`contour`).
 */

/** Grid px per sky px; where the edge stands; how far the heads move it. */
const CELL = 2, EDGE = 0.42, HEADS = 1.5, SMALL = 0.16
/** A puff's light and the mass's, against the planes' levels. */
const PUFF = 1.15, BROAD = 0.75
const LOCAL = -0.12, LIT = 0.36
const SIZE_MIN = 0.12
/** The room heads stand in, against the rows' spacing, and at most (px). */
const HEAD_ROOM = 0.55, HEAD_MAX = 12

export function paintCutSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, _env: PaintEnv): void {
  const f = sheetField(desc)
  if (!f) return
  const wide = eased(f)
  const cols = Math.ceil(f.width / CELL) + 1, rows = Math.ceil(f.height / CELL) + 1
  const frame = { x: f.x0, y: f.y0, w: f.width, h: f.height }
  const grid = () => ({ cols, rows, at: new Float32Array(cols * rows).fill(-9) })
  const edge = grid(), light = grid()
  const head = billows(hashId(desc.id))
  let v = 0, solid = 0, tones = 0, city = 0
  for (let j = 0; j < rows; j++) {
    const gy = (j * (f.rows - 1)) / (rows - 1), size = Math.max(SIZE_MIN, Math.sqrt(Math.min(1, f.spacing[Math.round(gy)] / 20)))
    v += CELL / size
    for (let i = 0; i < cols; i++) {
      const gx = (i * (f.cols - 1)) / (cols - 1), a = fieldAt(wide, f.cols, f.rows, gx, gy)
      if (a < 0.004) continue
      const puff = head((i * CELL - f.width / 2) / size, v), part = 4 * a * (1 - a), n = j * cols + i
      const broad = fieldAt(f.side, f.cols, f.rows, gx, gy)
      // A calm foot: heads stand on tops, not under a base.
      const top = broad > 0 ? 1 : Math.max(0.15, 1 + broad * 1.4)
      edge.at[n] = a + f.open * part * top * (HEADS * puff.high + SMALL * puff.small) - EDGE
      light.at[n] = Math.min(edge.at[n] * 12, PUFF * puff.light + BROAD * broad * f.open + 0.1 * puff.small)
      if (edge.at[n] > 0) {
        solid += a
        tones += a * fieldAt(f.tone, f.cols, f.rows, gx, gy)
        city += a * fieldAt(f.city, f.cols, f.rows, gx, gy)
      }
    }
  }
  if (!solid) return
  const t = tonesOf(desc, tones / solid, city / solid)
  ctx.save()
  if (desc.lattice === 'high') ctx.globalAlpha *= 0.4
  cut(ctx, edge, -0.1, frame, t.shade, 0.28)
  cut(ctx, edge, 0, frame, t.shade)
  cut(ctx, light, LOCAL, frame, t.local)
  cut(ctx, light, LIT, frame, t.lit)
  ctx.restore()
}

/** The mass's outline eased over a share of its rows' spacing: the room its heads stand in. */
function eased(f: SheetField): Float32Array {
  const buf = new Float32Array(f.alpha.length * 4), cell = f.height / (f.rows - 1), across = f.width / (f.cols - 1)
  f.alpha.forEach((a, n) => { buf[n * 4] = a })
  const px = f.spacing.map((s) => Math.min(HEAD_MAX, HEAD_ROOM * s) * f.open)
  soften(buf, f.cols, f.rows, px.map((v) => (1.3 * v) / across), px.map((v) => v / cell))
  return f.alpha.map((_, n) => buf[n * 4])
}

function cut(ctx: Ctx2D, grid: Grid, level: number, frame: Frame, rgb: RGB, alpha = 1) {
  ctx.beginPath()
  traceOver(ctx, grid, level, frame, 10)
  ctx.fillStyle = css(rgb, alpha)
  ctx.fill()
}

function tonesOf(desc: LayerOf<'cloudSheet'>, tone: number, city: number) {
  const body = toneOf(desc, tone), low = lowLight(desc)
  const under = (rgb: RGB) => (desc.city ? addLight(rgb, desc.city.rgb, city) : rgb)
  return {
    shade: pigment(under(mix(body, desc.shade, 0.55)), -1),
    local: pigment(under(mix(body, desc.lit, 0.35)), -0.3),
    lit: pigment(under(mix(desc.lit, whitened(desc.lit), 1 - low)), 0.4),
  }
}
