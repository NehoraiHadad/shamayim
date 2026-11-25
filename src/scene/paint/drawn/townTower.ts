import type { OutsideItem, Shine, Tones } from '../../model/types'
import { rng } from '../shared/base/core'
import { aviationLamp, type Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import { bodyPlanes, type Print } from './townBlock'
import { joint, keyedBox, snap, type Pen } from './townKey'
import { planesOf, plasterOf, sideWidth, type Planes, type TownLight } from './townLight'
import { townWindows } from './townWindows'

/*
 * A tower of the drawn town (v1b's Carmel tower), as the print cuts it: a shaft of two flat blocks, its front and the one
 * side it shows, its windows a calm grid cut out of the front, a podium, its own crown. A glass shaft is one flat tint of
 * its glass, with one bokashi: the block wiped darker toward its foot, where the town's shade gathers. Pure: the
 * tower's seed.
 */

/** The crown: a setback's share of the height and at most (px), its width; a mast's height. */
const SETBACK = 0.14, SETBACK_MAX = 4, SETBACK_W = 0.62, MAST = 1.5, MAST_SHARE = 0.08, MAST_MAX = 5
/** A full tower's podium past its sides, its share of the height and at most (px). */
const PODIUM = 1.2, PODIUM_SHARE = 0.12, PODIUM_MAX = 3
/** A glass shaft's share of glass and of the sky's light in its front; the bokashi's reach up the shaft and its depth at the foot. */
const GLASS = 0.55, GLASS_LIT = 0.4, WIPE = 0.45, WIPE_DEEP = 0.3
/** The floors' lines where no window is cut: their least spacing (px). */
const FLOOR = 2.6

export function paintDrawnTower(ctx: Ctx2D, tw: Extract<OutsideItem, { kind: 'tower' }>, t: Tones, l: TownLight,
  s: Shine, lamps: Lamp[], pen: Pen, print: Print = { tier: 'far', seated: false }) {
  const r = rng(tw.seed * 7 + 1), stone = r(), day = 1 - s.night, k = pen.scale
  const x0 = snap(tw.x - tw.w / 2, k), w = Math.max(1 / k, snap(tw.x + tw.w / 2, k) - x0), base = snap(tw.base, k)
  const top = snap(tw.base - tw.h, k)
  const setback = tw.crown === 1 ? snap(Math.min(tw.h * SETBACK, SETBACK_MAX), k) : 0, shaft = top + setback
  const plaster = tw.full ? mix(plasterOf(t, 0.4 * stone), t.glass, GLASS * day) : plasterOf(t, 0.3 + 0.5 * stone)
  const own = planesOf(t, l, plaster, stone, print.tier, print.anchor)
  // A glass shaft's block is one flat tint of its glass, the sky's light in it by day.
  const planes = tw.full ? { ...own, front: mix(own.front, t.glassLit, GLASS_LIT * day), side: mix(own.side, t.glass, 0.3 * day) } : own
  const front = bodyPlanes(ctx, x0, shaft, w, base - shaft, sideWidth(l, w), planes, pen)
  if (tw.full) wiped(ctx, x0, shaft, w, base - shaft, t)
  const cut = townWindows(ctx, { top: shaft + 0.6, foot: base - 1, storeys: tw.storeys }, t, l, front, planes.front, r, lamps,
    s.windows * 0.8, pen)
  if (!cut) floors(ctx, x0, shaft, w, base, tw.storeys, planes, pen)
  roofEdge(x0, shaft, w)
  // Where the plane cuts the tower's seat, its foot is the plane's ground line (and the podium stands over it).
  keyedBox(ctx, x0, shaft, w, base - shaft, planes.ink, pen, true, !print.seated || tw.full)
  if (setback) {
    const cw = snap(w * SETBACK_W, k), cx = snap(tw.x - cw / 2, k)
    bodyPlanes(ctx, cx, top, cw, setback, sideWidth(l, cw), planes, pen)
    roofEdge(cx, top, cw)
    keyedBox(ctx, cx, top, cw, setback + pen.line, planes.ink, pen)
  }
  let tip = top
  if (tw.crown === 2) {
    tip = top - Math.min(MAST_MAX, MAST + tw.h * MAST_SHARE)
    ctx.fillStyle = css(planes.ink)
    ctx.fillRect(snap(tw.x, k) - 1 / k, tip, 2 / k, top - tip)
  }
  if (tw.full) {
    const ph = snap(Math.min(PODIUM_MAX, tw.h * PODIUM_SHARE), k), pw = snap(w + 2 * PODIUM, k), px = snap(tw.x - pw / 2, k)
    const podium = planesOf(t, l, plasterOf(t, stone), stone, print.tier, print.anchor)
    bodyPlanes(ctx, px, base - ph, pw, ph, sideWidth(l, pw), podium, pen)
    roofEdge(px, base - ph, pw)
    keyedBox(ctx, px, base - ph, pw, ph, podium.ink, pen, true, !print.seated)
  }
  if (tw.full || tw.storeys >= 30) lamps.push(aviationLamp(tw.x, tip - 0.4, s))

  function roofEdge(x: number, y: number, rw: number) {
    ctx.fillStyle = css(planes.roof)
    ctx.fillRect(x, y, rw, Math.max(1 / k, snap(0.5, k)))
  }
}

/** The glass block's bokashi: wiped from nothing at its reach up the shaft to its depth at the foot. */
function wiped(ctx: Ctx2D, x: number, top: number, w: number, h: number, t: Tones) {
  const from = top + h * (1 - WIPE), g = ctx.createLinearGradient(0, from, 0, top + h)
  g.addColorStop(0, css(t.deep, 0))
  g.addColorStop(1, css(t.deep, WIPE_DEEP))
  ctx.fillStyle = g
  ctx.fillRect(x, from, w, top + h - from)
}

/** Where no window is cut, the floors: a join every few storeys. */
function floors(ctx: Ctx2D, x: number, top: number, w: number, base: number, storeys: number, p: Planes, pen: Pen) {
  const every = Math.max(FLOOR, ((base - top) / Math.max(1, storeys)) * 2)
  for (let y = top + every; y < base - every * 0.6; y += every) joint(ctx, x, snap(y, pen.scale), w, false, p.joint, pen)
}
