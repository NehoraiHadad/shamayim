import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import type { LayerOf } from '../../../../src/scene/model/types'
import { towerMass } from '../../../../src/scene/paint/drawn/towerMass'
import { whitened } from '../../../../src/scene/paint/drawn/cloudLight'
import { smoothstep } from '../../../../src/domain/smoothstep'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { billowed, block, inMasses, keyline } from './billow'
import { paintCaps } from './caps'
import { feet } from './feet'
import { capInks, cloudInks } from './inks'
import { lobesOf } from './lobes'

/*
 * A tower as a print: the model's column, shoulders, base and anvil as one billowed block, its caps lit on their tops and
 * on the light's side, over a dark level base. Far first.
 */

const CELL = 2, EDGE = 0.36
/** The most cells a tower takes; a cap's most, against the tower's width. */
const CELLS = 10000, LOBE = 0.3, LOBE_MAX = 30
/** The light across against the light from above; where the base ends. */
const ACROSS = 0.75, UP = 1.05, BASE = 0.1
/** What a cap's place in its mass does to its light. */
const SIDE = 0.8
/** Optical depths from which a tower is heavy; how heavy a deep one and a raining one are; its foot's most, against its width. */
const DEEP = [8, 40] as const, THICK = 0.45, RAINS = 0.85, FOOT = 0.5

export function paintCutCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) tower(ctx, sprite, x, y, env)
}

function tower(ctx: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv) {
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
  const under = mix(s.shade, s.lit, 0.6 * s.glow), caught = 0.35 + 0.6 * Math.min(1, s.litA), lit = mix(s.body, s.lit, caught)
  const heavy = s.rains ? RAINS : THICK * smoothstep(DEEP[0], DEEP[1], s.tau)
  const t = cloudInks({ lit, bright: mix(s.body, whitened(s.lit), caught), body: mix(s.body, under, 0.15), shade: under, heavy, gain: 1.35 })
  console.log('[proto] cell w', s.w, 'tau', s.tau, 'rains', s.rains, 'litA', s.litA, 'line', t.line.toFixed(2), 'lit', s.lit, 'body', s.body, 'shade', s.shade)
  const grid = { cols, rows, at }, frame = { x: x - mass.reach, y: y + top, w: (cols - 1) * step, h: (rows - 1) * step }
  const most = Math.min(LOBE_MAX, Math.max(5, LOBE * s.w)), line = Math.min(1, s.w / 90) * t.line
  const loops = billowed(grid, 0, frame, () => most * 0.5, s.seed, true)
  block(ctx, loops, [t.local, t.half, t.shade, t.foot])
  inMasses(ctx, loops, () => paintCaps(ctx, lobesOf({ cols, rows, at, side, most: () => most / step, seed: s.seed }), {
    x: frame.x, y: frame.y, step, seed: s.seed,
    ink: (l) => capInks(t, Math.min(1, Math.max(0, 0.5 + SIDE * l.side))),
    line: () => line,
  }))
  feet(ctx, loops, frame, { ink: t.foot, line: css(t.key, 0.32 * t.line), strength: 0.9, seed: s.seed, most: () => FOOT * s.w }, env)
  keyline(ctx, loops, 0.55, css(t.key, 0.42 * line), s.seed)
}
