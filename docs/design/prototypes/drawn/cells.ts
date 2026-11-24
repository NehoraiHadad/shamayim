import { smoothstep } from '../../../../src/domain/smoothstep'
import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import type { LayerOf } from '../../../../src/scene/model/types'
import { towerMass } from '../../../../src/scene/paint/drawn/towerMass'
import { whitened } from '../../../../src/scene/paint/drawn/cloudLight'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { billowed, inMasses, keyline } from './billow'
import { paintCaps } from './caps'
import { feet } from './feet'
import { capInks, cloudInks, lightOf } from './inks'
import { lobesOf } from './lobes'
import { wash } from './wash'

/*
 * A tower as a print: the model's column, shoulders, base and anvil as one billowed block, its caps lit on their tops and
 * on the light's side, over a dark level base. Far first.
 */

const CELL = 2, EDGE = 0.36
/** The most cells a tower takes; a cap's most, against the tower's width. */
const CELLS = 10000, LOBE = 0.3, LOBE_MAX = 30
/** The light across against the light from above; where the base ends, and how dark it is. */
const ACROSS = 0.75, UP = 1.05, BASE = 0.1, DARK = 0.9
/** What a cap's place in its mass does to its light. */
const SIDE = 0.75
/** How heavy a raining tower is at least; its foot's most, against its width. */
const RAINS = 0.6, FOOT = 0.4, FOOTS = 0.7
/** How far the light is eased (cells). */
const LIGHT = 2.5

export function paintCutCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) tower(ctx, sprite, x, y, env)
}

function tower(ctx: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv) {
  const mass = towerMass(s), top = -s.tall * 1.18 - 0.25 * s.w, w = 2 * mass.reach, h = mass.depth + 2 - top
  const step = Math.max(0.8, Math.min(CELL, s.w / 30), Math.sqrt((w * h) / CELLS))
  const cols = Math.ceil(w / step) + 1, rows = Math.ceil(h / step) + 1
  const at = new Float32Array(cols * rows).fill(-EDGE), side = new Float32Array(cols * rows), [tx] = s.toward ?? [0, -1]
  for (let j = 0; j < rows; j++) {
    const py = top + j * step, up = Math.min(1, Math.max(0, -py / s.tall)), raised = smoothstep(0, 2 * BASE, up)
    for (let i = 0; i < cols; i++) {
      const p = mass.at(-mass.reach + i * step, py)
      if (!p) continue
      at[j * cols + i] = p.alpha - EDGE
      const over = ACROSS * tx * p.across + UP * (up - 0.5) + 0.12 * p.light
      side[j * cols + i] = raised * over - (1 - raised) * DARK
    }
  }
  const under = mix(s.shade, s.lit, 0.6 * s.glow), caught = 0.35 + 0.6 * Math.min(1, s.litA), lit = mix(s.body, s.lit, caught)
  const t = cloudInks({ lit, bright: mix(s.body, whitened(s.lit), caught), body: mix(s.body, under, 0.15), shade: under, least: s.rains ? RAINS : 0, gain: 1.35 })
  const grid = { cols, rows, at }, frame = { x: x - mass.reach, y: y + top, w: (cols - 1) * step, h: (rows - 1) * step }
  const most = Math.min(LOBE_MAX, Math.max(5, LOBE * s.w)), line = Math.min(1, s.w / 90) * t.line
  const loops = billowed(grid, 0, frame, () => most * 0.5, s.seed, true)
  const light = side.map((v) => lightOf(t, 0.5 + SIDE * (0.6 + 0.4 * t.heavy) * v))
  wash(ctx, loops, grid, -EDGE, light, Array<number>(rows).fill(LIGHT), frame, t, env)
  inMasses(ctx, loops, () => paintCaps(ctx, lobesOf({ cols, rows, at, side, most: () => most / step, seed: s.seed }), {
    x: frame.x, y: frame.y, step, seed: s.seed,
    ink: (l) => capInks(t, light[l.n]),
    line: () => line,
  }))
  feet(ctx, loops, frame, { ink: t.foot, line: css(t.key, 0.32 * t.line), strength: FOOTS * (0.6 + 0.4 * t.heavy), seed: s.seed, most: () => FOOT * s.w }, env)
  keyline(ctx, loops, 0.55, css(t.key, 0.42 * line), s.seed)
}
