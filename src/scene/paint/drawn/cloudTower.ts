import { smoothstep } from '../../../domain/smoothstep'
import type { CloudSprite } from '../../model/cloudSprite'
import type { LayerOf } from '../../model/types'
import { css, mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { towerOpacity } from '../shared/cloud/layTower'
import { capTop, paintCap, traceCap } from './cloudCaps'
import { capInks, cloudInks, printed, type CloudInks } from './cloudInks'
import { whitened } from './cloudLight'
import { traceOver, type Frame } from './kit/contour'
import { FLAT, towerCaps } from './towerCaps'
import { fadeFoot, footCuts, keyTower } from './towerEdge'
import { OVER_TOP, towerMass, UNDER_FOOT, type TowerMass, type TowerPoint } from './towerMass'

/*
 * The field's towers as prints: the model's column, shoulders, base and anvil (`towerMass`) as one block with capped edges,
 * its light wiped over the whole of it, each cap lit on its top, inside a key line, over a dark foot cut level. Every tone
 * is the model's; far first. Pure: the desc and the scratch surfaces from `env`.
 */

/** The cells a tower's form and light are read at, at most, the px of its sheet, and the share of cloud its edge is cut at. */
const CELLS = 3600, SHEET_PX = 1_600_000, EDGE = 0.36
/** The light across against the light from above, the puffs' own; where the base ends (of the height) and how dark it is; all of it. */
const ACROSS = 0.75, UP = 1.05, PUFF = 0.12, BASE = 0.3, DARK = 0.9, SIDE = 0.75
/** What a light behind the tower gives its rim, and how near the edge that is. */
const SILVER = 0.45, RIM = 3
/** How heavy a raining tower is at least; the chroma its inks take (the body is half the sky's). */
const RAINS = 0.6, GAIN = 1.2
/** The width (px) of a tower that takes its key line whole; a print has no half-there block: the opacity it is whole from. */
const WHOLE_AT = 90, FIRM = 0.25
/** Room for the key line (px) and at the sides for the caps, against the width. */
const ROOM = { line: 2, wide: 0.15 } as const

/** Outside the mass. */
const NONE = { across: 0, light: 0, edge: 1 }

export function paintDrawnCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) tower(ctx, sprite, x, y, desc.bounds, env)
}

function tower(ctx: Ctx2D, s: CloudSprite, x: number, y: number, bounds: Frame, env: PaintEnv) {
  const opacity = smoothstep(0, FIRM, towerOpacity(s))
  if (!opacity) return
  const mass = towerMass(s), t = inksOf(s), lightAt = lightOf(s, t), line = t.line * Math.min(1, s.w / WHOLE_AT)
  const top = -s.tall - OVER_TOP - ROOM.line, wide = mass.reach + ROOM.wide * s.w
  const f: Frame = { x: -wide, y: top, w: 2 * wide, h: Math.max(mass.depth, s.under) + UNDER_FOOT + ROOM.line - top }, v = within(f, { ...bounds, x: bounds.x - x, y: bounds.y - y })
  if (v.w < 1 || v.h < 1) return
  const { wash, at, cols, rows } = washOf(mass, t, lightAt, f, env)
  const { caps, foot } = towerCaps(s, mass, EDGE), tops = caps.map(capTop), path = new Path2D()
  traceOver(path, { cols, rows, at }, 0, f)
  caps.forEach((cap, i) => traceCap(path, cap, tops[i]))
  for (const { x: cx, y: cy, r } of foot) {
    path.moveTo(cx + r, cy)
    path.ellipse(cx, cy, r, r * FLAT, 0, 0, 2 * Math.PI)
  }
  const k = Math.min(env.scale, Math.sqrt(SHEET_PX / (v.w * v.h))), w = Math.ceil(v.w * k), h = Math.ceil(v.h * k), { canvas, ctx: c } = env.canvas(w, h)
  c.save()
  c.scale(k, k)
  c.translate(-v.x, -v.y)
  c.fillStyle = css(t.half)
  c.fill(path)
  c.globalCompositeOperation = 'source-atop'
  c.imageSmoothingQuality = 'high'
  // Read at its cells' corners, laid by their middles.
  const sx = f.w / (cols - 1), sy = f.h / (rows - 1)
  c.drawImage(wash, f.x - sx / 2, f.y - sy / 2, f.w + sx, f.h + sy)
  caps.forEach((cap, i) => paintCap(c, cap, tops[i], capInks(t, lightAt(cap.y, cap)), line))
  footCuts(c, s, mass, t)
  keyTower(c, path, t, line)
  fadeFoot(c, f, mass)
  c.restore()
  ctx.save()
  ctx.globalAlpha *= opacity
  ctx.drawImage(canvas, x + v.x, y + v.y, w / k, h / k)
  ctx.restore()
}

/** The part of a frame inside another. */
function within(a: Frame, b: Frame): Frame {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y)
  return { x, y, w: Math.min(a.x + a.w, b.x + b.w) - x, h: Math.min(a.y + a.h, b.y + b.h) - y }
}

/** The tower's one printing of ink, its light wiped over all of it; and how far each place is inside its edge. */
function washOf(mass: TowerMass, t: CloudInks, lightAt: ReturnType<typeof lightOf>, f: Frame, env: PaintEnv) {
  const step = Math.max(0.8, Math.sqrt((f.w * f.h) / CELLS)), cols = Math.ceil(f.w / step) + 1, rows = Math.ceil(f.h / step) + 1
  const at = new Float32Array(cols * rows).fill(-EDGE), { canvas: wash, ctx } = env.canvas(cols, rows), image = ctx.createImageData(cols, rows)
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const y = f.y + (j / (rows - 1)) * f.h, p = mass.at(f.x + (i / (cols - 1)) * f.w, y), ink = printed(t, lightAt(y, p ?? NONE))
    if (p) at[n] = p.alpha - EDGE
    for (let m = 0; m < 3; m++) image.data[n * 4 + m] = Math.round(ink[m] * 255)
    image.data[n * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return { wash, at, cols, rows }
}

function inksOf(s: CloudSprite): CloudInks {
  const under = mix(s.shade, s.lit, 0.6 * s.glow), caught = 0.35 + 0.6 * Math.min(1, s.litA), lit = mix(s.body, s.lit, caught)
  return cloudInks({ lit, bright: mix(s.body, whitened(s.lit), caught), body: mix(s.body, under, 0.15), shade: under, least: s.rains ? RAINS : 0, gain: GAIN })
}

/** The light of a place in the tower (0 foot … 1 lit): from its height, the side it faces, its puff and a light behind it. */
function lightOf(s: CloudSprite, t: CloudInks) {
  const [tx] = s.toward ?? [0, -1], all = SIDE * (0.6 + 0.4 * t.heavy), dark = DARK * (0.4 + 0.6 * t.heavy)
  return (y: number, { across, light, edge }: Pick<TowerPoint, 'across' | 'light' | 'edge'>) => {
    const up = Math.min(1, Math.max(0, -y / s.tall)), raised = smoothstep(0, BASE, up)
    return Math.min(1, Math.max(0, 0.5 + all * (raised * (ACROSS * tx * across + UP * (up - 0.5) + PUFF * light) - (1 - raised) * dark) + SILVER * s.silver * raised * edge ** RIM))
  }
}
