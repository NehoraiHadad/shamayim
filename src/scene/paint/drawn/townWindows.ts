import type { RGB, Tones } from '../../model/types'
import type { Lamp } from '../glyphs/kit'
import { css, mix, type Ctx2D } from '../hand'
import type { TownLight } from './townLight'

/*
 * The drawn town's windows: few and large enough to read. Storeys too low to show one each share a row; the windows of a
 * front are dark by day, catch a low sun, and by night the model's lit share of them burns. Pure: the body's seed.
 */

/** A row's least height, a window's size against it, at most (px); the room a window takes across. */
const ROW_MIN = 1.75, TALL = 0.52, TALL_MAX = 1.25, WIDE = 0.75, PITCH = 1.75
/** The share of windows there are, and how dark they are by day and night. */
const PRESENT = 0.8, DARK = 0.42, DARK_NIGHT = 0.28
/** The halo's share, radius (px) and strength. */
const HALO = 0.2, HALO_R = 1.5, HALO_A = 0.28

interface Front { top: number; foot: number; storeys: number }

export function townWindows(ctx: Ctx2D, b: Front, t: Tones, l: TownLight, across: { x0: number; x1: number }, plaster: RGB,
  r: () => number, lamps: Lamp[], lit: number) {
  const h = b.foot - b.top, room = across.x1 - across.x0
  const rows = Math.min(b.storeys, Math.floor((h - 0.8) / ROW_MIN))
  if (rows < 1 || room < WIDE) return
  const pitch = (h - 0.8) / rows, tall = Math.min(TALL_MAX, TALL * pitch)
  const many = Math.max(1, Math.floor((room + PITCH - WIDE) / PITCH)), step = room / many
  const dark = css(t.deep, DARK + (DARK_NIGHT - DARK) * l.night), burning = css(mix(plaster, t.win, 0.92))
  const catching = css(mix(t.lit, t.win, 0.5), 0.9 * l.glint * l.front)
  const fade = Math.min(1, Math.max(0, (l.night - 0.6) / 0.2))
  for (let k = 0; k < rows; k++) {
    const y = b.top + 0.8 + k * pitch + (pitch - tall) * 0.45
    for (let n = 0; n < many; n++) {
      const there = r() < PRESENT, threshold = r(), catches = r() < 0.45, halo = r() < HALO
      if (!there) continue
      const x = across.x0 + (n + 0.5) * step - WIDE / 2, on = threshold < lit
      ctx.fillStyle = on ? burning : dark
      ctx.fillRect(x, y, WIDE, tall)
      if (!on && catches && l.glint > 0.01) {
        ctx.fillStyle = catching
        ctx.fillRect(x, y, WIDE, tall)
      }
      if (on && halo) lamps.push({ x: x + WIDE / 2, y: y + tall / 2, r: HALO_R, c: t.win, a: HALO_A * l.night, fade })
    }
  }
}
