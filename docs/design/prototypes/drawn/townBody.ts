import type { OutsideItem, RGB, Shine, Tones } from '../../../../src/scene/model/types'
import type { Block } from '../../../../src/scene/paint/drawn/townBlocks'
import { planesOf, plasterOf, type Planes, type TownLight } from '../../../../src/scene/paint/drawn/townLight'
import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, outline, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import { pigment } from './palette'
import { aviationLamp, type Lamp } from '../../../../src/scene/paint/shared/town/glyphs/kit'

/*
 * A house, a block and a tower, printed: a front, one plane on the light's side and one in shade, a roof, each a flat ink
 * wiped a little darker to its foot, the windows carved slots, and a key line round the body.
 */

const KEY = 0.36, KEY_DARK = 0.72
const SIDE = 0.16, SIDE_LIT = 0.2, SIDE_MAX = 5
/** A window's size and pitch (px); how dark it is by day; the share there are. */
const WIN_W = 0.95, WIN_H = 1.15, PITCH_X = 2.5, PITCH_Y = 2.7, DARK = 0.78, PRESENT = 0.72

type Sides = readonly [number, number]
const sidesOf = (l: TownLight, w: number): Sides => [l.left, l.right].map((k) => Math.min(SIDE_MAX, w * (SIDE + SIDE_LIT * Math.min(1, 1.6 * k)))) as [number, number]

/** The one side the light turns to: the other side of a narrow body is dropped, so it reads as two planes. */
function body(ctx: Ctx2D, x: number, top: number, w: number, h: number, [left, right]: Sides, p: Planes, l: TownLight) {
  ctx.fillStyle = css(p.front)
  ctx.fillRect(x, top, w, h)
  const lead = l.left >= l.right
  if (w > 5 || lead) { ctx.fillStyle = css(p.left); ctx.fillRect(x, top, left, h) }
  if (w > 5 || !lead) { ctx.fillStyle = css(p.right); ctx.fillRect(x + w - right, top, right, h) }
}

/** The body's ink, wiped darker to its foot, and the key line round it. */
function key(ctx: Ctx2D, x: number, top: number, w: number, h: number, t: Tones) {
  const wipe = ctx.createLinearGradient(0, top, 0, top + h)
  wipe.addColorStop(0.35, css(t.shade, 0))
  wipe.addColorStop(1, css(t.shade, 0.35))
  ctx.fillStyle = wipe
  ctx.fillRect(x, top, w, h)
  ctx.strokeStyle = css(t.deep, KEY_DARK)
  ctx.lineWidth = KEY
  ctx.strokeRect(x, top, w, h)
}

export function cutBlock(ctx: Ctx2D, b: Block, t: Tones, l: TownLight, lamps: Lamp[], windows: number) {
  const r = rng(b.seed ^ 0x3c1), stone = 0.35 + 0.65 * r(), x0 = b.x - b.w / 2, h = b.foot - b.top
  const plaster = plasterOf(t, stone), planes = planesOf(t, l, plaster, stone), sides = sidesOf(l, b.w)
  body(ctx, x0, b.top, b.w, h, sides, planes, l)
  key(ctx, x0, b.top, b.w, h, t)
  panes(ctx, x0 + sides[0], x0 + b.w - sides[1], b.top + (b.roof === 'tile' ? 0.8 : 1.2), b.foot - 0.8, b.storeys, t, l, plaster, r, lamps, windows)
  if (b.roof === 'tile') tiles(ctx, b, t, l)
  else {
    ctx.fillStyle = css(planes.roof)
    ctx.fillRect(x0 - 0.15, b.top, b.w + 0.3, Math.min(1, Math.max(0.5, h * 0.14)))
    ctx.fillStyle = css(t.deep, 0.7)
    ctx.fillRect(x0 - 0.3, b.top - 0.2, b.w + 0.6, 0.35)
  }
}

/** A tile roof: a hip of two clean planes over deep eaves. */
function tiles(ctx: Ctx2D, b: Block, t: Tones, l: TownLight) {
  const x0 = b.x - b.w / 2 - 0.5, x1 = b.x + b.w / 2 + 0.5, top = b.top - Math.min(3.2, 0.46 * b.w + 0.4), eave = b.top + 0.4, ridge = b.w * 0.2
  const plane = (k: number) => css(mix(mix(t.roof, t.shade, 0.3 * (1 - k)), t.roofLit, Math.min(1, 0.3 * l.top + 0.9 * k)))
  const lead = l.left >= l.right, split = b.x + (lead ? ridge : -ridge)
  ctx.fillStyle = plane(lead ? l.left : l.right * 0.4)
  outline(ctx, [[x0, eave], [b.x - ridge, top], [split, top], [split + (lead ? ridge : -ridge) * 0.6, eave]])
  ctx.fill()
  ctx.fillStyle = plane(lead ? l.right * 0.4 : l.right)
  outline(ctx, [[x1, eave], [b.x + ridge, top], [split, top], [split + (lead ? ridge : -ridge) * 0.6, eave]])
  ctx.fill()
  ctx.fillStyle = css(t.deep, 0.6)
  ctx.fillRect(x0 + 0.5, eave, b.w, 0.5)
  outline(ctx, [[x0, eave], [b.x - ridge, top], [b.x + ridge, top], [x1, eave]])
  ctx.strokeStyle = css(t.deep, KEY_DARK)
  ctx.lineWidth = KEY
  ctx.stroke()
}

function panes(ctx: Ctx2D, x0: number, x1: number, top: number, foot: number, storeys: number, t: Tones, l: TownLight, plaster: RGB,
  r: () => number, lamps: Lamp[], lit: number) {
  const least = l.night > 0.5 ? 1 : 0
  const rows = Math.max(least, Math.min(storeys, Math.floor((foot - top) / PITCH_Y + 0.35))), many = Math.max(least, Math.floor((x1 - x0) / PITCH_X + 0.45))
  if (rows < 1 || many < 1) return
  const dark = css(mix(plaster, t.deep, DARK)), warm = css(pigment(t.win, 0.5))
  for (let k = 0; k < rows; k++) {
    for (let n = 0; n < many; n++) {
      const there = r() < PRESENT, on = r() < lit * 1.6
      if (!there && !on) continue
      const x = x0 + ((n + 0.5) / many) * (x1 - x0) - WIN_W / 2, y = top + ((k + 0.5) / rows) * (foot - top) - WIN_H / 2
      ctx.fillStyle = on ? warm : dark
      ctx.fillRect(x, y, WIN_W, WIN_H)
      if (on && r() < 0.16) lamps.push({ x: x + WIN_W / 2, y: y + WIN_H / 2, r: 1.6, c: t.win, a: 0.2 * l.night })
    }
  }
}

export function cutTower(ctx: Ctx2D, tw: Extract<OutsideItem, { kind: 'tower' }>, t: Tones, l: TownLight, s: Shine, lamps: Lamp[]) {
  const r = rng(tw.seed * 7 + 1), stone = r(), day = 1 - s.night, x0 = tw.x - tw.w / 2, top = tw.base - tw.h
  const setback = tw.crown === 1 ? Math.min(tw.h * 0.14, 4) : 0, shaft = top + setback, h = tw.base - shaft
  const plaster = tw.full ? mix(plasterOf(t, 0.5), t.glass, 0.6 * day) : plasterOf(t, 0.4 + 0.6 * stone)
  const planes = planesOf(t, l, plaster, stone), sides = sidesOf(l, tw.w), in0 = x0 + sides[0], in1 = x0 + tw.w - sides[1]
  body(ctx, x0, shaft, tw.w, h, sides, planes, l)
  key(ctx, x0, shaft, tw.w, h, t)
  if (tw.full && day > 0.3) {
    // Glass: one slanted plane of mirrored sky.
    ctx.fillStyle = css(t.glassLit, 0.45 * day)
    outline(ctx, [[in0, shaft], [in1, shaft], [in1, shaft + h * 0.28], [in0, shaft + h * 0.5]])
    ctx.fill()
    ctx.fillStyle = css(t.deep, 0.35)
    for (let x = in0 + 1.6; x < in1 - 0.8; x += 1.8) ctx.fillRect(x, shaft + 1, 0.3, h - 2)
  } else if (day > 0.3 && tw.w > 2.2) {
    ctx.fillStyle = css(t.deep, 0.16)
    for (let y = shaft + 3; y < tw.base - 2; y += 3) ctx.fillRect(in0, y, in1 - in0, 0.7)
  }
  if (s.night > 0.3) panes(ctx, in0, in1, shaft + 1, tw.base - 1, tw.storeys, t, l, plaster, r, lamps, s.windows * 0.8)
  ctx.fillStyle = css(planes.roof)
  ctx.fillRect(x0, shaft, tw.w, 0.8)
  if (setback) {
    const w = tw.w * 0.62
    body(ctx, tw.x - w / 2, top, w, setback, sidesOf(l, w), planes, l)
    key(ctx, tw.x - w / 2, top, w, setback, t)
  }
  let tip = top
  if (tw.crown === 2) {
    tip = top - Math.min(5, 1.5 + tw.h * 0.08)
    ctx.fillStyle = css(mix(planes.front, t.rim, 0.3))
    ctx.fillRect(tw.x - 0.35, tip, 0.7, top - tip)
  }
  if (tw.full || tw.storeys >= 30) lamps.push(aviationLamp(tw.x, tip - 0.4, s))
}
