import type { RGB, Tones } from '../../model/types'
import { rng } from '../shared/base/core'
import type { Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import type { Block } from './townBlocks'
import { joint, keyedBox, snap, type Pen } from './townKey'
import { planesOf, plasterOf, sideWidth, type Planes, type TownLight } from './townLight'
import { flatRoof, tileRoof } from './townRoof'
import { townWindows } from './townWindows'

/*
 * A house or a block of the drawn town, as the print cuts it: a front block and the one side it shows, each one flat
 * value of the named light, its roof, a few windows cut out of the front, the whole inside one key line; under it, where
 * the hill falls away across it, the terrace wall it stands on. Pure: the block's seed.
 */

/** Where the ground under a body lies, at its two corners (px): the body's own foot where none is given. */
export interface Seat { left: number; right: number }
/** A terrace wall's least height to be cut (px), its most against the body's height, and its tallest (px). */
const WALL_LEAST = 0.45, WALL_MOST = 0.6, WALL_TALLEST = 3
/** How far the ground's key line runs past a body's walls (px). */
const GROUND_RUN = 0.5
/** The pen as it stands where none is given (tests, one device pixel per px). */
const PEN: Pen = { scale: 1, line: 1 }

export function paintBlock(ctx: Ctx2D, b: Block, t: Tones, l: TownLight, lamps: Lamp[], windows: number, pen: Pen = PEN,
  seat?: Seat) {
  const r = rng(b.seed ^ 0x3c1), stone = r(), s = pen.scale
  const x0 = snap(b.x - b.w / 2, s), x1 = snap(b.x + b.w / 2, s), top = snap(b.top, s), foot = snap(b.foot, s)
  const w = Math.max(1 / s, x1 - x0), h = Math.max(1 / s, foot - top), plaster = plasterOf(t, stone)
  const planes = planesOf(t, l, plaster, stone)
  const walled = seat ? terrace(ctx, x0, w, foot, h, seat, t, planes, pen) : false
  const front = bodyPlanes(ctx, x0, top, w, h, sideWidth(l, w), planes, pen)
  const roofed = b.roof === 'tile'
  const deep = roofed ? 0 : flatRoof(ctx, b, x0, top, w, h, t, planes, pen)
  townWindows(ctx, { top: top + deep, foot, storeys: b.storeys }, t, l, front, planes.front, r, lamps, windows, pen)
  keyedBox(ctx, x0, top, w, h, planes.ink, pen, !roofed)
  // The ground's key line along the foot, run a little past the walls into the ground, where no terrace wall carries it.
  if (!walled) {
    ctx.fillStyle = css(planes.ink)
    ctx.fillRect(x0 - GROUND_RUN, foot - pen.line, w + 2 * GROUND_RUN, pen.line)
  }
  if (roofed) tileRoof(ctx, x0, top, w, front, t, l, planes, pen)
}

/**
 * The two blocks of a standing body, the front and the one side it shows, flat; the join between them. Returns the front's
 * span across.
 */
export function bodyPlanes(ctx: Ctx2D, x: number, top: number, w: number, h: number, side: number, p: Planes, pen: Pen) {
  const sw = w < 2 ? 0 : Math.max(1 / pen.scale, snap(side, pen.scale))
  ctx.fillStyle = css(p.front)
  ctx.fillRect(x, top, w, h)
  if (!sw) return { x0: x, x1: x + w }
  const at = p.right ? x + w - sw : x
  ctx.fillStyle = css(p.side)
  ctx.fillRect(at, top, sw, h)
  joint(ctx, p.right ? at : at + sw, top, h, true, p.joint, pen)
  return p.right ? { x0: x, x1: at } : { x0: at + sw, x1: x + w }
}

/**
 * The terrace wall under a body on a hill that falls across it: the stone the hill villages build their houses on, down
 * from the body's foot to the ground on its low side, its own block of stone in its own key line.
 */
function terrace(ctx: Ctx2D, x: number, w: number, foot: number, h: number, seat: Seat, t: Tones, p: Planes, pen: Pen) {
  const most = Math.max(WALL_LEAST, Math.min(WALL_TALLEST, WALL_MOST * h))
  const left = Math.min(most, Math.max(0, seat.left - foot)), right = Math.min(most, Math.max(0, seat.right - foot))
  if (Math.max(left, right) < WALL_LEAST) return false
  const stone: RGB = mix(mix(t.stone, p.front, 0.4), t.shade, 0.15)
  const pts = [[x, foot], [x + w, foot], [x + w, foot + right], [x, foot + left]] as const
  ctx.fillStyle = css(stone)
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  ctx.fill()
  // The wall's key: its two ends a join's ink, its foot the ground's key line, the body's knife.
  ctx.lineWidth = pen.line
  ctx.lineCap = 'butt'
  ctx.strokeStyle = css(p.joint)
  ctx.beginPath()
  ctx.moveTo(x + pen.line / 2, foot)
  ctx.lineTo(x + pen.line / 2, foot + left)
  ctx.moveTo(x + w - pen.line / 2, foot)
  ctx.lineTo(x + w - pen.line / 2, foot + right)
  ctx.stroke()
  ctx.strokeStyle = css(p.ink)
  ctx.beginPath()
  ctx.moveTo(x - GROUND_RUN, foot + left - pen.line / 2)
  ctx.lineTo(x + w + GROUND_RUN, foot + right - pen.line / 2)
  ctx.stroke()
  // A course of the stone, where the wall is tall enough to carry one.
  if (Math.max(left, right) > 2.2) joint(ctx, x + 1 / pen.scale, foot + Math.min(left, right) / 2 + 0.3, w - 2 / pen.scale, false, p.joint, pen)
  return true
}
