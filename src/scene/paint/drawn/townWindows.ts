import type { RGB, Tones } from '../../model/types'
import type { Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import { snap, type Pen } from './townKey'
import type { TownLight } from './townLight'

/*
 * The drawn town's windows: notches cut out of the front's block, few, large enough to read and set in a regular grid,
 * one row to a pair of storeys. A front too small to carry one shows none. By day they are the front's own colour gone
 * dark; by night the model's lit share of them burns. Pure: the body's seed (which windows burn).
 */

/** A window's size (px), its pitch across (px), a row's least height (px), the margin it keeps in its front (px). */
const WIDE = 1, TALL = 1.5, PITCH = 2.5, ROW = 3.2, MARGIN = 0.7
/** The least front that carries a window, across and up (px). */
const LEAST = 3.6
/** How dark a notch is against its front, by day and by night. */
const DARK = 0.5, DARK_NIGHT = 0.35
/** The halo's share, radius (px) and strength. */
const HALO = 0.2, HALO_R = 1.5, HALO_A = 0.28

interface Front { top: number; foot: number; storeys: number }

export function townWindows(ctx: Ctx2D, b: Front, t: Tones, l: TownLight, across: { x0: number; x1: number }, face: RGB,
  r: () => number, lamps: Lamp[], lit: number, pen: Pen) {
  const h = b.foot - b.top - MARGIN, room = across.x1 - across.x0 - MARGIN
  if (room < LEAST - MARGIN || h < LEAST - MARGIN) {
    // A small body cuts no notch by day; by night one lamp of it may burn, as many as the model's share.
    if (lit > 0 && r() < lit && room > 0 && h > 0) {
      const x = snap((across.x0 + across.x1) / 2 - WIDE / 2, pen.scale), y = snap(b.top + h * 0.35, pen.scale)
      ctx.fillStyle = css(mix(face, t.win, 0.92))
      ctx.fillRect(x, y, Math.max(1 / pen.scale, snap(WIDE * 0.8, pen.scale)), Math.max(1 / pen.scale, snap(1, pen.scale)))
    }
    return false
  }
  const rows = Math.max(1, Math.min(Math.ceil(b.storeys / 2), Math.floor(h / ROW)))
  const many = Math.max(1, Math.floor(room / PITCH)), s = pen.scale
  const pitch = h / rows, step = room / many
  const wide = Math.max(1 / s, snap(WIDE, s)), tall = Math.max(2 / s, snap(Math.min(TALL, pitch * 0.55), s))
  const dark = css(mix(face, t.deep, DARK + (DARK_NIGHT - DARK) * l.night)), burning = css(mix(face, t.win, 0.92))
  const fade = Math.min(1, Math.max(0, (l.night - 0.6) / 0.2))
  for (let k = 0; k < rows; k++) {
    const y = snap(b.top + MARGIN + k * pitch + (pitch - tall) * 0.4, s)
    for (let n = 0; n < many; n++) {
      const threshold = r(), halo = r() < HALO
      const x = snap(across.x0 + MARGIN / 2 + (n + 0.5) * step - wide / 2, s), on = threshold < lit
      ctx.fillStyle = on ? burning : dark
      ctx.fillRect(x, y, wide, tall)
      if (on && halo) lamps.push({ x: x + wide / 2, y: y + tall / 2, r: HALO_R, c: t.win, a: HALO_A * l.night, fade })
    }
  }
  return true
}
