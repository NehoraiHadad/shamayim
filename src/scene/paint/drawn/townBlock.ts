import type { RGB, Tones } from '../../model/types'
import { rng } from '../shared/base/core'
import type { Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import type { Tier } from './kit/lines'
import type { Block } from './townBlocks'
import { joint, keyedBox, keyedEdges, snap, type Pen } from './townKey'
import { wallOf } from './townSeats'
import type { Edges, Run } from './townSilhouette'
import { planesOf, plasterOf, sideWidth, type Anchor, type Planes, type TownLight } from './townLight'
import { flatRoof, tileRoof } from './townRoof'
import { townWindows } from './townWindows'

/*
 * A house or a block of the drawn town, as the print cuts it: a front block and the one side it shows, each one flat
 * value of the named light, its roof, a few windows cut out of the front, the whole inside one key line; under it, where
 * the hill falls away across it, the terrace wall it stands on. Pure: the block's seed.
 */

/** Where the ground under a body lies, at its two corners (px): the body's own foot where none is given. */
export interface Seat { left: number; right: number }
/**
 * How a body is printed beyond its light: its key's distance, its ground's anchor, and whether the plane cuts its seat
 * (`land/seats`: then its foot takes no key, the plane's ground line is its foot).
 */
export interface Print { tier: Tier; anchor?: Anchor; seated: boolean }
const PRINT: Print = { tier: 'far', seated: false }
/** A body under this height (device px) is two flat blocks, its roof or top and its wall, keyed only on the skyline: a ring
 *  of key round so few pixels is all line. */
const SMALL_DEVICE = 6
/** A side is shown only where its edge stands to the air over at least this share of the body's height. */
const SIDE_OPEN = 0.5
/** How far the ground's key line runs past a body's walls (px). */
const GROUND_RUN = 0.5
/** The pen as it stands where none is given (tests, one device pixel per px). */
const PEN: Pen = { scale: 1, line: 1 }
/** A low patch's step from its roof tone toward the key's ink. */
const PATCH = 0.15

export function paintBlock(ctx: Ctx2D, b: Block, t: Tones, l: TownLight, lamps: Lamp[], windows: number, pen: Pen = PEN,
  seat?: Seat, edges?: Edges, print: Print = PRINT) {
  const r = rng(b.seed ^ 0x3c1), stone = r(), s = pen.scale
  const x0 = snap(b.x - b.w / 2, s), x1 = snap(b.x + b.w / 2, s), top = snap(b.top, s), foot = snap(b.foot, s)
  const w = Math.max(1 / s, x1 - x0), h = Math.max(1 / s, foot - top), plaster = plasterOf(t, stone)
  const own = planesOf(t, l, plaster, stone, print.tier, print.anchor)
  // At dusk a small body is one block of its ground's value: its slab no lighter than its wall.
  const planes = print.anchor?.k && (foot - top) * s < SMALL_DEVICE ? { ...own, roof: mix(own.roof, own.front, print.anchor.k) } : own
  // The back tier's key is the lighter joint's ink: at a pixel wide, a full key round a far house is all there is of it.
  const ink = print.tier === 'back' ? planes.joint : planes.ink
  if (b.low) {
    // Too low to stand: one flat block of its roof's tone, a value step on the ground, no key.
    ctx.fillStyle = css(mix(planes.roof, planes.ink, PATCH))
    ctx.fillRect(x0, foot - h, w, h)
    return
  }
  const small = h * s < SMALL_DEVICE, roofed = b.roof === 'tile'
  const walled = seat ? terrace(ctx, x0, w, foot, h, seat, t, planes, pen, print.seated) : false
  // The side shows where the body's edge stands to the air: inside a terrace only its end unit shows one.
  const open = (runs: readonly Run[] | undefined) => !runs || runs.reduce((sum, r) => sum + (r.key ? r.to - r.from : 0), 0) >= SIDE_OPEN * h
  const side = small || !open(planes.right ? edges?.right : edges?.left) ? 0 : sideWidth(l, w)
  const front = bodyPlanes(ctx, x0, top, w, h, side, planes, pen)
  const deep = roofed ? 0 : flatRoof(ctx, b, x0, top, w, h, t, planes, pen)
  // A small body cuts no notch by day (too few pixels), but by night one lamp of it may burn.
  townWindows(ctx, { top: top + deep, foot, storeys: b.storeys }, t, l, front, planes.front, r, lamps, windows, pen)
  if (small) {
    // Two flat blocks: the key only where the mass meets the sky over it.
    // At dusk (the town anchored to its ground) a small flat roof takes no head key: its slab's step is enough.
    if (edges && !roofed && !print.anchor?.k) keyedEdges(ctx, x0, top, w, h, { left: [], right: [], foot: [], top: edges.top.filter((run) => run.key) }, ink, planes.joint, pen)
  } else {
    // Where the plane cuts the body's seat, its foot is the plane's ground line, not a key of the body's own.
    const keyed = edges && print.seated ? { ...edges, foot: [] } : edges
    const ends = keyed ? keyedEdges(ctx, x0, top, w, h, keyed, ink, planes.joint, pen, !roofed)
      : (keyedBox(ctx, x0, top, w, h, ink, pen, !roofed, !print.seated), { left: !print.seated, right: !print.seated })
    // The ground's key line runs a little past the walls into the ground where the foot is keyed at a corner and no terrace
    // wall carries it.
    if (!walled && !print.seated) {
      ctx.fillStyle = css(ink)
      if (ends.left) ctx.fillRect(x0 - GROUND_RUN, foot - pen.line, GROUND_RUN, pen.line)
      if (ends.right) ctx.fillRect(x0 + w, foot - pen.line, GROUND_RUN, pen.line)
      if (!edges) ctx.fillRect(x0, foot - pen.line, w, pen.line)
    }
    if (planes.rim && (side === 0 || planes.rim.right !== planes.right)) rimOf(ctx, x0, top + deep, w, h - deep, planes, pen, edges)
  }
  if (roofed) tileRoof(ctx, b, x0, top, w, front, t, l, planes, pen, small && !edges?.top.some((run) => run.key))
}

/** Against the light, the front's edge toward the sun: one device pixel of the light inside the key, where it meets the air. */
function rimOf(ctx: Ctx2D, x0: number, top: number, w: number, h: number, p: Planes, pen: Pen, edges?: Edges) {
  if (!p.rim) return
  const px = 1 / pen.scale, k = Math.min(pen.line, w / 3), right = p.rim.right
  const runs = edges ? (right ? edges.right : edges.left).filter((r) => r.key) : [{ from: top, to: top + h, key: true }]
  ctx.fillStyle = css(p.rim.rgb)
  for (const r of runs) {
    const from = Math.max(top, snap(r.from, pen.scale)), to = Math.min(top + h - k, snap(r.to, pen.scale))
    if (to > from) ctx.fillRect(right ? x0 + w - k - px : x0 + k, from, px, to - from)
  }
}

/**
 * The two blocks of a standing body, the front and the one side it shows, flat; the join between them. Returns the front's
 * span across.
 */
export function bodyPlanes(ctx: Ctx2D, x: number, top: number, w: number, h: number, side: number, p: Planes, pen: Pen) {
  const sw = w < 2 || side <= 0 ? 0 : Math.max(1 / pen.scale, snap(side, pen.scale))
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
function terrace(ctx: Ctx2D, x: number, w: number, foot: number, h: number, seat: Seat, t: Tones, p: Planes, pen: Pen, seated: boolean) {
  const wall = wallOf(foot, h, seat)
  if (!wall) return false
  const { left, right } = wall
  const stone: RGB = p.tint(mix(mix(t.stone, p.front, 0.4), t.shade, 0.15), -0.03)
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
  if (!seated) {
    ctx.strokeStyle = css(p.ink)
    ctx.beginPath()
    ctx.moveTo(x - GROUND_RUN, foot + left - pen.line / 2)
    ctx.lineTo(x + w + GROUND_RUN, foot + right - pen.line / 2)
    ctx.stroke()
  }
  // A course of the stone, where the wall is tall enough to carry one.
  if (Math.max(left, right) > 2.2) joint(ctx, x + 1 / pen.scale, foot + Math.min(left, right) / 2 + 0.3, w - 2 / pen.scale, false, p.joint, pen)
  return true
}
