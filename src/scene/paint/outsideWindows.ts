import { smoothstep } from '../../domain/smoothstep'
import type { OutsideItem, RGB, Shine, Tones } from '../model/types'
import type { Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { MIN_STOREY_PX, type facesOf } from './outsideLight'

type Box = Extract<OutsideItem, { kind: 'box' }>
interface Wall { r: () => number; face: number; wall: RGB; detail: number; fl: ReturnType<typeof facesOf> }

/** A box narrower than this (px) shows no window rows. */
const WINDOW_MIN_W = 1.6
const PITCH = 1.25, PANE_W = .55, PRESENT = .7
const paneHeight = (storey: number) => Math.min(.6, storey * .5)

/** The share of a box's whole wall its dark panes cover, coming up with the width that has room for them. */
export function recessShare(b: Box, face: number, h: number): number {
  const storey = h / b.storeys
  return PRESENT * PANE_W / PITCH * (paneHeight(storey) / storey)
    * Math.max(0, 1 - (2 * face + .45) / b.w) * smoothstep(1.2, 2.2, b.w)
}

/**
 * Window rows, a storey each: dark recesses by day, as far as their size lets them be seen, and a few lamps by night (the
 * lit share); a low sun catches the glass of a face turned to it.
 */
export function paintWindows(ctx: Ctx2D, b: Box, { r, face, wall, detail, fl }: Wall, t: Tones, s: Shine, lamps: Lamp[]) {
  const x0 = b.x - b.w / 2, storey = (b.foot - b.top) / b.storeys
  if (b.w < WINDOW_MIN_W || storey < MIN_STOREY_PX) return
  const glint = fl.glint * (1 - s.night)
  const fade = Math.min(1, Math.max(0, (s.night - .6) / .2))
  const ph = paneHeight(storey)
  const inner0 = x0 + face + .25, inner1 = x0 + b.w - face - .2
  for (let k = 0; k < b.storeys; k++) {
    const wy = b.top + .7 + k * storey
    if (wy + .5 > b.foot - .4) break
    for (let wx = inner0; wx + .5 <= inner1; wx += PITCH) {
      const present = r() >= 1 - PRESENT
      const threshold = r(), catches = r() < .45, halo = r() < .12
      if (!present) continue
      const on = threshold < s.windows
      ctx.fillStyle = on ? css(mix(wall, t.win, .9)) : css(t.deep, (.5 - .2 * s.night) * detail)
      ctx.fillRect(wx, wy, PANE_W, ph)
      if (!on && catches) {
        ctx.fillStyle = css(mix(t.lit, t.win, .5), .9 * glint * fl.front)
        ctx.fillRect(wx, wy, PANE_W, ph)
      }
      if (on && halo) lamps.push({ x: wx + .27, y: wy + .3, r: 1.3, c: t.win, a: .25 * s.night, fade })
    }
    // The side faces' glass: a tick of the low sun in each storey of the face turned to it.
    for (const [x, k] of [[x0 + face * .3, fl.left], [x0 + b.w - face * .7, fl.right]] as const) {
      if (r() < .5) {
        ctx.fillStyle = css(mix(t.lit, t.win, .5), glint * k * detail)
        ctx.fillRect(x, wy, Math.max(.3, face * .4), ph)
      }
    }
  }
}
