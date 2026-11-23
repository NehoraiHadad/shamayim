import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { towerMass } from '../../../../src/scene/paint/drawn/towerMass'
import { whitened } from '../../../../src/scene/paint/drawn/cloudLight'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { traceOver, type Grid } from './contour'
import { pigment } from './palette'

/*
 * A tower as cut paper: the model's column, shoulders, base and anvil as one scalloped silhouette in shade, a local plane
 * and a lit plane on its tops and on the light's side, its base a flat dark plane. Far first.
 */

const CELL = 2, EDGE = 0.36, LOCAL = -0.06, LIT = 0.34
const SIDE = 0.55, PUFF = 0.95, UP = 0.5, BASE = 0.2

export function paintCutCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, _env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) tower(ctx, sprite, x, y)
}

function tower(ctx: Ctx2D, s: CloudSprite, x: number, y: number) {
  const mass = towerMass(s), step = Math.max(0.8, Math.min(CELL, s.w / 24)), top = -s.tall * 1.18
  const cols = Math.ceil((2 * mass.reach) / step) + 1, rows = Math.ceil((mass.depth + 2 - top) / step) + 1
  const grid = (): Grid => ({ cols, rows, at: new Float32Array(cols * rows).fill(-9) })
  const edge = grid(), light = grid(), base = grid(), [tx] = s.toward ?? [0, -1]
  for (let j = 0; j < rows; j++) {
    const py = top + j * step, up = Math.min(1, Math.max(0, -py / s.tall))
    for (let i = 0; i < cols; i++) {
      const p = mass.at(-mass.reach + i * step, py)
      if (!p) continue
      const n = j * cols + i
      edge.at[n] = p.alpha - EDGE
      light.at[n] = Math.min(edge.at[n] * 12, PUFF * p.light + SIDE * tx * p.across + UP * (up - 0.5) + 0.3 * p.edge * Math.max(0, up - 0.2))
      base.at[n] = Math.min(edge.at[n] * 12, BASE + 0.25 * p.light - up)
    }
  }
  const under = mix(s.shade, s.lit, 0.6 * s.glow), bright = mix(whitened(s.lit), s.lit, 0.3)
  const frame = { x: x - mass.reach, y: y + top, w: (cols - 1) * step, h: (rows - 1) * step }
  const cut = (g: Grid, level: number, rgb: RGB, alpha = 1) => {
    ctx.beginPath()
    traceOver(ctx, g, level, frame)
    ctx.fillStyle = css(rgb, alpha)
    ctx.fill()
  }
  cut(edge, -0.14, pigment(s.shade, -0.5), 0.25)
  cut(edge, 0, pigment(mix(s.body, s.shade, 0.62), -0.9))
  cut(base, 0, pigment(mix(s.body, under, 0.9), -0.8))
  cut(light, LOCAL, pigment(mix(s.body, bright, 0.22), -0.3))
  cut(light, LIT, pigment(mix(s.body, bright, 0.35 + 0.6 * Math.min(1, s.litA)), 0.4))
}
