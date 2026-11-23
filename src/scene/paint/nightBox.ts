import type { OutsideItem, Shine, Tones } from '../model/types'
import { rng } from './core'
import type { Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { facesOf, sideFace } from './outsideLight'

import { paintBoxWindows } from './outsideWindows'

/**
 * One built cell: its plaster front (lit by its own share when it faces the light), both side faces by theirs, its window
 * rows (a low sun glinting in the glass of a face turned to it), a soft shade under its eave and at its foot among the
 * others; a house its tile roof (each plane by its own share) or flat roof (with a heater on some), a block of the mass
 * its roof edge.
 */
export function paintNightBox(ctx: Ctx2D, b: Extract<OutsideItem, { kind: 'box' }>, t: Tones, s: Shine, lamps: Lamp[]) {
  const r = rng(b.seed)
  const tint = r()
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  const fl = facesOf(s)
  const wall = mix(t.wall, t.stone, .1 + .45 * tint)
  ctx.fillStyle = css(wall)
  ctx.fillRect(x0, b.top, b.w, h)
  ctx.fillStyle = css(mix(t.lit, t.stoneLit, .3 * tint), .85 * fl.front)
  ctx.fillRect(x0, b.top, b.w, h)
  const face = Math.min(1, b.w * .26)
  const litTone = mix(t.lit, t.stoneLit, .3 * tint)
  sideFace(ctx, x0, b.top, face, h, fl.left, fl.on, t, litTone)
  sideFace(ctx, x0 + b.w - face, b.top, face, h, fl.right, fl.on, t, litTone)
  // The foot among the others: the ground and the neighbours hide part of the sky there (soft, deeper in the sun's
  // contrast); under the eave a thin soft shade.
  if (h > 1.4) {
    const g = ctx.createLinearGradient(0, b.foot - Math.min(h * .4, 3), 0, b.foot)
    g.addColorStop(0, css(t.deep, 0))
    g.addColorStop(1, css(t.deep, .16 + .14 * fl.on))
    ctx.fillStyle = g
    ctx.fillRect(x0, b.foot - Math.min(h * .4, 3), b.w, Math.min(h * .4, 3))
  }
  paintBoxWindows(ctx, b, t, s, lamps, r, mix(wall, t.win, .9), t.deep, mix(t.lit, t.win, .5))
  if (b.roof === 'tile') {
    // A hipped tile roof: each plane by its own share of the light (its normal half toward its side, half up), its
    // eave's soft shade under it.
    const rh = Math.min(2.2, .45 * b.w + .3), x1 = x0 + b.w
    ctx.fillStyle = css(t.roof)
    ctx.beginPath()
    ctx.moveTo(x0 - .35, b.top + .15); ctx.lineTo(x0 + b.w * .35, b.top - rh); ctx.lineTo(x0 + b.w * .65, b.top - rh); ctx.lineTo(x1 + .35, b.top + .15)
    ctx.closePath()
    ctx.fill()
    const planes = [[fl.left, 1], [fl.right, -1]] as const
    for (const [k, dir] of planes) {
      const a = Math.min(1, .6 * k + .55 * fl.top)
      ctx.fillStyle = css(t.roofLit, a)
      ctx.beginPath()
      if (dir > 0) { ctx.moveTo(x0 - .35, b.top + .15); ctx.lineTo(x0 + b.w * .35, b.top - rh); ctx.lineTo(x0 + b.w * .5, b.top - rh); ctx.lineTo(x0 + b.w * .3, b.top + .15) }
      else { ctx.moveTo(x1 + .35, b.top + .15); ctx.lineTo(x0 + b.w * .65, b.top - rh); ctx.lineTo(x0 + b.w * .5, b.top - rh); ctx.lineTo(x0 + b.w * .7, b.top + .15) }
      ctx.closePath()
      ctx.fill()
    }
    // A back-lit roof: its ridge line catches the light beyond.
    ctx.fillStyle = css(t.rim, .7 * fl.rim)
    ctx.fillRect(x0 + b.w * .35, b.top - rh, b.w * .3, .3)
    ctx.fillStyle = css(t.shade, .5)
    ctx.fillRect(x0, b.top + .15, b.w, .35)
    ctx.fillStyle = css(t.shade, .18 + .17 * fl.on)
    ctx.fillRect(x0, b.top + .5, b.w, .45)
    return
  }
  // A flat roof: its edge catches the sky, the light from above, or the light beyond it; a parapet's dark line under it;
  // a solar heater on some houses.
  const sky = t.rim
  const up = Math.min(1, fl.top + .3 * Math.max(fl.left, fl.right) + .5 * fl.rim)
  ctx.fillStyle = css(mix(sky, mix(t.rim, t.lit, .3), up), (.55 + .3 * tint) * (1 - .45 * s.night))
  ctx.fillRect(x0, b.top, b.w, .45)
  ctx.fillStyle = css(t.deep, .35)
  ctx.fillRect(x0, b.top + .45, b.w, .3)
  ctx.fillStyle = css(t.deep, .1 + .1 * fl.on)
  ctx.fillRect(x0, b.top + .75, b.w, .4)
  if (b.heater && b.w > 2.6) {
    const hx = x0 + b.w * (.3 + .4 * tint)
    ctx.fillStyle = css(mix(t.stoneLit, t.lit, .3))
    ctx.fillRect(hx, b.top - .9, 1.1, .5)
    ctx.fillStyle = css(t.panel)
    ctx.beginPath()
    ctx.moveTo(hx - 1.2, b.top); ctx.lineTo(hx - .15, b.top - .8); ctx.lineTo(hx - .15, b.top)
    ctx.closePath()
    ctx.fill()
  }
}
