import { hashId } from '../../../../src/data/landmarks/hash'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { addLight } from '../../../../src/scene/model/tone'
import { toneOf } from '../../../../src/scene/paint/shared/cloud/deck'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { soften } from '../../../../src/scene/paint/shared/base/soften'
import { fractal } from '../../../../src/scene/paint/shared/base/core'
import { lowLight, whitened } from '../../../../src/scene/paint/drawn/cloudLight'
import { fieldAt, sheetField } from '../../../../src/scene/paint/drawn/sheetField'
import type { Grid } from './contour'
import { paintDeck } from './deck'
import { farRows } from './farRows'
import { billowed, inMasses, keyline } from './billow'
import { paintCaps } from './caps'
import { feet } from './feet'
import { capInks, cloudInks } from './inks'
import { lobesOf } from './lobes'
import { wash } from './wash'

/*
 * A cloud sheet as a print. Broken cloud is billowed blocks with caps (`billow`), where the model puts them, and far off low
 * arches over a level foot; a closed deck lies in rolls (`deck`), a high veil thin over the sky.
 */

/** Grid px per sky px; where the edge stands; how much a far cloud is cut back from the next, how far a slow noise bends it. */
const CELL = 2, EDGE = 0.56, PARTED = 0.8, BEND = 0.16, FREQ = 0.035
/** How far the model's own rows are eased into each other (against their spacing), and the far ones along themselves (px). */
const EASE = 0.16, FAR = 7
/** A lobe's size against its row's spacing, and at least and at most (px). */
const LOBE = 2.3, LOBE_MIN = 5, LOBE_MAX = 42
/** A row this far apart (px) is near; nearer to 0 than this, the sheet stands in rows (`farRows`). */
const NEAR = 14, ROWS = 0.24
/** What a lobe's place in its mass, and the model's own tone there, do to its light. */
const SIDE = 0.6, TONE = 1.6
/** The most a foot's ink rises (px, and against its row). */
const FOOT = 34, FOOT_ROWS = 2.6
/** The shade an open sheet keeps of the model's: the rest leans to its light, as `real` has it. */
const KEEPS = 0.55
/** A deck this open stands in lobes. */
const OPEN = 0.3

export function paintCutSheet(ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv): void {
  const f = sheetField(desc)
  if (!f) return
  const cols = Math.ceil(f.width / CELL) + 1, rows = Math.ceil(f.height / CELL) + 1, seed = hashId(desc.id)
  const frame = { x: f.x0, y: f.y0, w: f.width, h: f.height }
  const wide = new Float32Array(f.alpha.length * 4), ease = f.spacing.map((s) => EASE * s)
  f.alpha.forEach((a, n) => { wide[n * 4] = a })
  const grid = (): Grid => ({ cols, rows, at: new Float32Array(cols * rows).fill(-9) })
  // The model's rows are far apart overhead: their steps are eased before an edge is cut along them.
  const far = f.spacing.map((s) => Math.max(0, 1 - s / NEAR))
  soften(wide, f.cols, f.rows, ease.map((v, n) => (1.4 * v + FAR * far[n]) / (f.width / (f.cols - 1))), ease.map((v) => v / (f.height / (f.rows - 1))))
  const edge = grid(), side = grid(), tone = grid()
  const alpha = f.alpha.map((_, n) => wide[n * 4])
  const broken = f.open > OPEN && desc.lattice !== 'high', rowsOf = broken ? farRows(f, alpha, seed) : null
  let solid = 0, tones = 0, city = 0
  for (let j = 0; j < rows; j++) {
    const gy = (j * (f.rows - 1)) / (rows - 1), near = Math.min(1, f.spacing[Math.round(gy)] / NEAR)
    for (let i = 0; i < cols; i++) {
      const gx = (i * (f.cols - 1)) / (cols - 1), a = fieldAt(alpha, f.cols, f.rows, gx, gy), n = j * cols + i
      if (a < 0.004) continue
      const bend = fractal(seed % 997, i * CELL, j * CELL, FREQ / (0.3 + near), (1.6 * FREQ) / (0.3 + near), 2) - 0.5
      edge.at[n] = a + BEND * 4 * a * (1 - a) * bend - EDGE
      side.at[n] = fieldAt(f.side, f.cols, f.rows, gx, gy)
      // A far cloud ends before the next one under it begins.
      if (broken) edge.at[n] -= PARTED * (1 - near) * Math.max(0, Math.abs(side.at[n]) - 0.45)
      if (rowsOf && near < ROWS) {
        const far = rowsOf(i * CELL, j * CELL), w = Math.min(1, (3 * (ROWS - near)) / ROWS)
        edge.at[n] += w * (far.edge - edge.at[n])
        side.at[n] += w * (far.side - side.at[n])
      }
      const t = fieldAt(f.tone, f.cols, f.rows, gx, gy)
      tone.at[n] = t
      if (edge.at[n] > 0) { solid += a; tones += a * t; city += a * fieldAt(f.city, f.cols, f.rows, gx, gy) }
    }
  }
  if (!solid) return
  const mean = tones / solid, t = tonesOf(desc, mean, broken ? KEEPS : 1, city / solid)
  ctx.save()
  if (desc.lattice === 'high') ctx.globalAlpha *= 0.4
  const rowAt = (y: number) => f.spacing[Math.min(f.rows - 1, Math.max(0, Math.round(((y - f.y0) / f.height) * (f.rows - 1))))]
  const nearAt = (y: number) => Math.min(1, rowAt(y) / NEAR)
  if (broken) {
    const loops = billowed(edge, 0, frame, (y) => Math.min(26, Math.max(3.5, 1.5 * rowAt(y))), seed)
    const up = side.at.map((v, n) => Math.min(1, Math.max(0, 0.5 + SIDE * (0.7 + 0.3 * t.heavy) * v - TONE * (tone.at[n] - mean))))
    wash(ctx, loops, edge, -8, up, frame, t, env)
    const most = (j: number) => Math.min(LOBE_MAX, Math.max(LOBE_MIN, LOBE * f.spacing[Math.round((j * (f.rows - 1)) / (rows - 1))])) / CELL
    const lobes = lobesOf({ cols, rows, at: edge.at, side: side.at, most, seed })
    inMasses(ctx, loops, () => paintCaps(ctx, lobes, {
      x: f.x0, y: f.y0, step: CELL, seed,
      ink: (l) => capInks(t, up[l.n]),
      line: (l) => nearAt(f.y0 + l.y * CELL) * t.line,
    }))
    feet(ctx, loops, frame, { ink: t.foot, line: css(t.key, 0.32 * t.line), strength: 0.7, seed, most: (y) => Math.min(FOOT * (1 + t.heavy), FOOT_ROWS * rowAt(y)) }, env)
    keyline(ctx, loops, 0.55, css(t.key, 0.42 * t.line), seed)
  } else {
    const loops = billowed(edge, 0, frame, (y) => Math.min(24, Math.max(4, 1.6 * rowAt(y))), seed, true, 0.6)
    inMasses(ctx, loops, () => paintDeck(ctx, f, mean, t, seed))
    keyline(ctx, loops, 0.55, css(t.key, 0.3 * t.line), seed)
  }
  ctx.restore()
}

/** The sheet's inks, its body the model's mean tone as far as the sheet `keeps` it. */
function tonesOf(desc: LayerOf<'cloudSheet'>, tone: number, keeps: number, city: number) {
  const low = lowLight(desc), under = (rgb: RGB) => (desc.city ? addLight(rgb, desc.city.rgb, city) : rgb)
  const body = under(mix(desc.lit, toneOf(desc, tone), keeps))
  const t = cloudInks({ lit: under(desc.lit), bright: under(mix(desc.lit, whitened(desc.lit), 1 - low)), body, shade: under(desc.shade) })
  console.log('[proto] sheet', desc.id, 'tone', tone.toFixed(2), 'heavy', t.heavy.toFixed(2), 'line', t.line.toFixed(2))
  return t
}
