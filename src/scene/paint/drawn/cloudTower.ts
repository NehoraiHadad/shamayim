import { smoothstep } from '../../../domain/smoothstep'
import type { CloudSprite } from '../../model/cloudSprite'
import type { LayerOf } from '../../model/types'
import { css, mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { towerOpacity } from '../shared/cloud/layTower'
import { capTop, paintCap } from './cloudCaps'
import { capInks, cloudInks, printed, type CloudInks } from './cloudInks'
import { whitened } from './cloudLight'
import { traceOver, type Frame } from './kit/contour'
import { towerCaps } from './towerCaps'
import { fadeFoot, footCuts, keyTower } from './towerEdge'
import { towerMass, type TowerMass } from './towerMass'

/*
 * The field's towers as prints: the model's column, shoulders, base and anvil (`towerMass`) as one block with capped edges,
 * its light wiped over the whole of it, each cap lit on its top, inside a key line, over a dark foot cut level. Every tone
 * is the model's; far first. Pure: the desc and the scratch surfaces from `env`.
 */

/** The cells a tower's form and light are read at, at most, the px of its sheet, and the share of cloud its edge is cut at. */
const CELLS = 3600, SHEET_PX = 1_600_000, EDGE = 0.36
/** The light across against the light from above, the puffs' own; where the base ends (of the height) and how dark it is; all of it. */
const ACROSS = 0.75, UP = 1.05, PUFF = 0.12, BASE = 0.3, DARK = 0.9, SIDE = 0.75
/** How heavy a raining tower is at least; the chroma its inks take. */
const RAINS = 0.6, GAIN = 1.35
/** The width (px) of a tower that takes its key line whole; a scallop's flatness. */
const WHOLE_AT = 90, FLAT = 0.4
/** Room over the crown for the caps, against the height and the width; under the foot, against its depth. */
const ROOM = { tall: 1.1, wide: 0.3, under: 1.3 } as const

export function paintDrawnCells(ctx: Ctx2D, desc: LayerOf<'cloudCells'>, env: PaintEnv): void {
  for (const { sprite, x, y } of desc.cells) tower(ctx, sprite, x, y, env)
}

function tower(ctx: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv) {
  const opacity = towerOpacity(s)
  if (!opacity) return
  const mass = towerMass(s), t = inksOf(s), lightAt = lightOf(s, t), line = t.line * Math.min(1, s.w / WHOLE_AT)
  const top = -s.tall * ROOM.tall - s.w * ROOM.wide, f: Frame = { x: -mass.reach, y: top, w: 2 * mass.reach, h: mass.depth * ROOM.under + 2 - top }
  const { wash, at, cols, rows } = washOf(mass, t, lightAt, f, env)
  const { caps, foot } = towerCaps(s, mass, EDGE), tops = caps.map(capTop), path = new Path2D()
  traceOver(path, { cols, rows, at }, 0, f)
  for (const pts of tops) {
    pts.forEach(([px, py], i) => (i ? path.lineTo(px, py) : path.moveTo(px, py)))
    path.closePath()
  }
  for (const { x: cx, y: cy, r } of foot) {
    path.moveTo(cx + r, cy)
    path.ellipse(cx, cy, r, r * FLAT, 0, 0, 2 * Math.PI)
  }
  const k = Math.min(env.scale, Math.sqrt(SHEET_PX / (f.w * f.h))), w = Math.ceil(f.w * k), h = Math.ceil(f.h * k), { canvas, ctx: c } = env.canvas(w, h)
  c.save()
  c.scale(k, k)
  c.translate(-f.x, -f.y)
  c.fillStyle = css(t.half)
  c.fill(path)
  c.globalCompositeOperation = 'source-atop'
  c.imageSmoothingQuality = 'high'
  c.drawImage(wash, f.x, f.y, f.w, f.h)
  caps.forEach((cap, i) => paintCap(c, cap, tops[i], capInks(t, lightAt(cap.y, cap.across, cap.light)), line))
  footCuts(c, s, mass, t)
  keyTower(c, path, s, t, line)
  fadeFoot(c, f, mass)
  c.restore()
  ctx.save()
  ctx.globalAlpha *= opacity
  ctx.drawImage(canvas, x + f.x, y + f.y, w / k, h / k)
  ctx.restore()
}

/** The tower's one printing of ink, its light wiped over all of it; and how far each place is inside its edge. */
function washOf(mass: TowerMass, t: CloudInks, lightAt: ReturnType<typeof lightOf>, f: Frame, env: PaintEnv) {
  const step = Math.max(0.8, Math.sqrt((f.w * f.h) / CELLS)), cols = Math.ceil(f.w / step) + 1, rows = Math.ceil(f.h / step) + 1
  const at = new Float32Array(cols * rows).fill(-EDGE), { canvas: wash, ctx } = env.canvas(cols, rows), image = ctx.createImageData(cols, rows)
  for (let j = 0, n = 0; j < rows; j++) for (let i = 0; i < cols; i++, n++) {
    const y = f.y + (j / (rows - 1)) * f.h, p = mass.at(f.x + (i / (cols - 1)) * f.w, y), ink = printed(t, lightAt(y, p?.across ?? 0, p?.light ?? 0))
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

/** The light of a place in the tower (0 foot … 1 lit): from its height, the side it faces and its puff. */
function lightOf(s: CloudSprite, t: CloudInks) {
  const [tx] = s.toward ?? [0, -1], all = SIDE * (0.6 + 0.4 * t.heavy), dark = DARK * (0.4 + 0.6 * t.heavy)
  return (y: number, across: number, puff: number) => {
    const up = Math.min(1, Math.max(0, -y / s.tall)), raised = smoothstep(0, BASE, up)
    return Math.min(1, Math.max(0, 0.5 + all * (raised * (ACROSS * tx * across + UP * (up - 0.5) + PUFF * puff) - (1 - raised) * dark)))
  }
}
