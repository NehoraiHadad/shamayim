import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { towerMass } from '../../../../src/scene/paint/drawn/towerMass'
import { whitened } from '../../../../src/scene/paint/drawn/cloudLight'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { traceOver } from './contour'
import { lobesOf, paintLobes } from './lobes'
import { pigment } from './palette'

/*
 * A tower as cut paper: the model's column, shoulders, base and anvil as one silhouette of lobes, lit on its tops and on
 * the light's side, over one dark flat base. Far first.
 */

const CELL = 2, EDGE = 0.36
/** A lobe's most, against the tower's width, and the light across against the light from above. */
const LOBE = 0.2, LOBE_MAX = 30, ACROSS = 0.75, UP = 1.05
const BASE = 0.1

export function paintCutCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, _env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) tower(ctx, sprite, x, y)
}

function tower(ctx: Ctx2D, s: CloudSprite, x: number, y: number) {
  const mass = towerMass(s), step = Math.max(0.8, Math.min(CELL, s.w / 30)), top = -s.tall * 1.18
  const cols = Math.ceil((2 * mass.reach) / step) + 1, rows = Math.ceil((mass.depth + 2 - top) / step) + 1
  const at = new Float32Array(cols * rows).fill(-9), side = new Float32Array(cols * rows), [tx] = s.toward ?? [0, -1]
  for (let j = 0; j < rows; j++) {
    const py = top + j * step, up = Math.min(1, Math.max(0, -py / s.tall))
    for (let i = 0; i < cols; i++) {
      const p = mass.at(-mass.reach + i * step, py)
      if (!p) continue
      at[j * cols + i] = p.alpha - EDGE
      side[j * cols + i] = up < BASE ? -0.9 : ACROSS * tx * p.across + UP * (up - 0.5) + 0.12 * p.light
    }
  }
  const under = mix(s.shade, s.lit, 0.6 * s.glow), bright = mix(whitened(s.lit), s.lit, 0.3), lit = 0.35 + 0.6 * Math.min(1, s.litA)
  const cut = (by: number, turn: number): RGB => pigment(mix(s.body, by > 0 ? bright : under, Math.abs(by)), turn, 1.35)
  const frame = { x: x - mass.reach, y: y + top, w: (cols - 1) * step, h: (rows - 1) * step }
  ctx.beginPath()
  traceOver(ctx, { cols, rows, at }, 0, frame)
  ctx.fillStyle = css(cut(-0.45, -0.4))
  ctx.fill()
  ctx.beginPath()
  traceOver(ctx, { cols, rows, at: at.map((a, n) => (a > 0 ? Math.min(a * 12, -0.6 - side[n]) : -9)) }, 0, frame)
  ctx.fillStyle = css(cut(-0.75, -0.4))
  ctx.fill()
  const most = Math.min(LOBE_MAX, Math.max(4, LOBE * s.w)) / step
  const lobes = lobesOf({ cols, rows, at, side, most: () => most, seed: Math.round(x * 13 + y * 7) })
  paintLobes(ctx, lobes, [
    { down: 0.28, rgb: cut(0.3 * lit, -0.1), cap: cut(lit, 0.4) }, { down: -0.1, rgb: cut(0.12 * lit, -0.2), cap: cut(0.4 * lit, 0) },
    { down: -0.6, rgb: cut(-0.25, -0.4), cap: cut(0.08, -0.3) },
  ], { x: x - mass.reach, y: y + top, step, toward: Math.sign(tx) })
}
