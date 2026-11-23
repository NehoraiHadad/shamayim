import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { towerMass } from '../../../../src/scene/paint/drawn/towerMass'
import { whitened } from '../../../../src/scene/paint/drawn/cloudLight'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { billowed, block, feet, keyline, paintCaps } from './billow'
import { lobesOf } from './lobes'
import { papered, pigment, valued } from './palette'

/*
 * A tower as a print: the model's column, shoulders, base and anvil as one billowed block, its caps lit on their tops and
 * on the light's side, over a dark level base. Far first.
 */

const CELL = 2, EDGE = 0.36
/** The most cells a tower takes; a cap's most, against the tower's width. */
const CELLS = 10000, LOBE = 0.3, LOBE_MAX = 30
/** The light across against the light from above; where the base ends. */
const ACROSS = 0.75, UP = 1.05, BASE = 0.1

export function paintCutCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, _env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) tower(ctx, sprite, x, y)
}

function tower(ctx: Ctx2D, s: CloudSprite, x: number, y: number) {
  const mass = towerMass(s), top = -s.tall * 1.18 - 0.25 * s.w, w = 2 * mass.reach, h = mass.depth + 2 - top
  const step = Math.max(0.8, Math.min(CELL, s.w / 30), Math.sqrt((w * h) / CELLS))
  const cols = Math.ceil(w / step) + 1, rows = Math.ceil(h / step) + 1
  const at = new Float32Array(cols * rows).fill(-EDGE), side = new Float32Array(cols * rows), [tx] = s.toward ?? [0, -1]
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
  const ink = (by: number, turn: number): RGB => pigment(mix(s.body, by > 0 ? bright : under, Math.abs(by)), turn, 1.35)
  const light = papered(ink(lit, 0.3), 0.6 * lit), tones = { local: ink(0.35 * lit, 0), half: ink(-0.05, -0.2), shade: ink(-0.5, -0.4), foot: ink(-0.8, -0.5) }
  const key = pigment(valued(mix(s.body, under, 0.9), -0.17), -0.8, 1.35)
  const grid = { cols, rows, at }, frame = { x: x - mass.reach, y: y + top, w: (cols - 1) * step, h: (rows - 1) * step }
  const most = Math.min(LOBE_MAX, Math.max(5, LOBE * s.w))
  const loops = billowed(grid, 0, frame, () => most * 0.5, s.seed, true)
  block(ctx, loops, [tones.local, tones.half, tones.shade, tones.foot])
  paintCaps(ctx, lobesOf({ cols, rows, at, side, most: () => most / step, seed: s.seed }), {
    x: frame.x, y: frame.y, step, toward: Math.sign(tx), seed: s.seed,
    ink: (l) => {
      const up = Math.min(1, Math.max(0, 0.5 + 0.75 * l.side))
      return { lit: mix(tones.half, light, up), local: mix(tones.shade, tones.local, up), shade: mix(tones.foot, tones.half, 0.8 * up), key }
    },
    line: () => Math.min(1, s.w / 90),
  })
  feet(ctx, loops, css(tones.foot), css(key, 0.32), 0.8, s.seed)
  keyline(ctx, loops, 0.55, css(key, 0.4 * Math.min(1, s.w / 90)), s.seed)
}
