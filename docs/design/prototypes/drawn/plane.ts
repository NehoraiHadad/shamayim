import { fractal } from '../../../../src/scene/paint/shared/base/core'
import { shadowBeam } from '../../../../src/scene/model/planeField'
import { labOf, rgbOfLab } from '../../../../src/scene/model/tone'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { css, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { soften } from '../../../../src/scene/paint/shared/base/soften'
import { paintVegFields, paintVegRows, paintVegStrata } from '../../../../src/scene/paint/shared/land/landVegetation'
import { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb, type PlaneTexelCtx } from '../../../../src/scene/paint/shared/land/planeTexel'
import { mapInk, receiverBrush } from '../../../../src/scene/paint/shared/land/receiverBrush'
import { vegetationLight } from '../../../../src/scene/paint/shared/land/vegetationLight'
import { TEXEL } from '../../../../src/scene/model/planeBands'
import { classesOf } from './classes'
import { traceOver } from './contour'
import { groundDabs, groundKey, groundLines } from './groundMarks'
import { pigment } from './palette'

/*
 * The land as flat shapes of paint: the model's lit ground (its cover, relief, shadow, snow and air) gathered into a few
 * pots of colour a plane, each laid as closed shapes with clean edges; then the fields, beds and rows on it, and the hand's
 * own dabs along the slope. Farther planes take fewer pots and fewer marks.
 */

/** The pots a plane takes; how far its values part about their mean; how many cells the colours are gathered over. */
const POTS = { near: 6, far: 4, back: 3 } as const
const PART = 1.3, GATHER = 1.3, EDGE = 0.43, LEAST = 7
/** How far a slow noise bends the patches' sides (px): the model's lie in columns, the land's do not. */
const BENT = 70, BENT_SEED = 733

export function paintCutPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  lay(ctx, desc, desc.light.litField.eSun)
  if (env.shade) lay(env.shade, desc, shadowBeam(desc.light.litField))
}

function lay(ctx: Ctx2D, desc: LayerOf<'plane'>, beam: RGB) {
  ctx.save()
  const { bounds } = desc, field = desc.light.litField
  if (desc.surfaceTone.palette.length && desc.surfaceTone.cells.length) {
    const t = preparePlaneTexels(desc.outline, bounds, desc.surfaceTone, field, desc.grain.seed, 0)
    const pots = shapes(ctx, t, POTS[desc.plane], beam)
    const veg = desc.vegetation, raw = vegetationLight(veg.tones, { ...field, eSun: beam }, desc.outline, bounds, false)
    const toneAt: typeof raw = (i, x, y) => mapInk(raw(i, x, y), (rgb) => pigment(rgb, 0.2))
    const brush = receiverBrush(ctx)
    paintVegStrata(brush, veg, toneAt)
    paintVegFields(brush, veg, toneAt)
    groundLines(ctx, desc)
    paintVegRows(brush, veg, toneAt)
    groundDabs(ctx, desc, t, pots)
    groundKey(ctx, desc, t, pots(bounds.x + bounds.w / 2, bounds.y + bounds.h * 0.6))
  } else {
    ctx.fillStyle = css(pigment(desc.fill))
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
  }
  ctx.globalCompositeOperation = 'destination-in'
  outline(ctx, desc.outline)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()
}

/** The pots' shapes over the plane's box; gives back the colour a cell was laid in. */
function shapes(ctx: Ctx2D, t: PlaneTexelCtx, k: number, beam: RGB): (x: number, y: number) => RGB {
  const cols = t.wPx, rows = t.hPx, { bounds, crestY, footY } = t
  const buf = new Float32Array(cols * rows * 4), on = new Uint8Array(cols * rows)
  for (let j = 0, n = 0; j < rows; j++) {
    const y = bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < cols; i++, n++) {
      const deep = Math.min(1, Math.max(0, (y - crestY[i]) / 40)), x = bounds.x + (i + 0.5) * TEXEL
      const bx = x + deep * BENT * (fractal(BENT_SEED, x, y, 0.012, 0.03, 2) - 0.5), bi = Math.min(cols - 1, Math.max(0, Math.floor((bx - bounds.x) / TEXEL)))
      const lab = labOf(shadeTexelSrgb(t, samplePlaneTexel(t, bi, bx, y), 1, beam))
      buf.set([lab.l, lab.a, lab.b, 1], n * 4)
      on[n] = y >= crestY[i] - TEXEL && y <= footY[i] + TEXEL ? 1 : 0
    }
  }
  soften(buf, cols, rows, Array(rows).fill(GATHER * 1.4), Array(rows).fill(GATHER * 0.8))
  const lab = new Float32Array(cols * rows * 3)
  for (let n = 0; n < on.length; n++) lab.set(buf.subarray(n * 4, n * 4 + 3), n * 3)
  const { label, pots, count } = classesOf(lab, on, k)
  const whole = count.reduce((a, b) => a + b, 0) || 1
  const mean = count.reduce((sum, c, i) => sum + c * pots[i * 3], 0) / whole
  const paint = [...count.keys()].map((c): RGB => pigment(rgbOfLab({
    l: Math.min(1, Math.max(0, mean + PART * (pots[c * 3] - mean))), a: pots[c * 3 + 1], b: pots[c * 3 + 2] }), pots[c * 3] > mean ? 0.5 : -0.35))
  const order = [...count.keys()].filter((c) => count[c]).sort((a, b) => count[b] - count[a])
  ctx.fillStyle = css(paint[order[0]] ?? [0, 0, 0])
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
  const frame = { x: bounds.x + TEXEL / 2, y: bounds.y + TEXEL / 2, w: (cols - 1) * TEXEL, h: (rows - 1) * TEXEL }
  for (const c of order.slice(1)) {
    ctx.beginPath()
    traceOver(ctx, { cols, rows, at: indicator(label, c, cols, rows) }, EDGE, frame, LEAST)
    ctx.fillStyle = css(paint[c])
    ctx.fill()
  }
  return (x, y) => {
    const i = Math.min(cols - 1, Math.max(0, Math.floor((x - bounds.x) / TEXEL))), j = Math.min(rows - 1, Math.max(0, Math.floor((y - bounds.y) / TEXEL)))
    return paint[label[j * cols + i]]
  }
}

/** Where a pot lies, its edges eased over a cell or two. */
function indicator(label: Uint8Array, c: number, cols: number, rows: number): Float32Array {
  const buf = new Float32Array(cols * rows * 4)
  for (let n = 0; n < label.length; n++) buf[n * 4] = label[n] === c ? 1 : 0
  soften(buf, cols, rows, Array(rows).fill(1.1), Array(rows).fill(0.7))
  return Float32Array.from({ length: label.length }, (_, n) => buf[n * 4])
}
