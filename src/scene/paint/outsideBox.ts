import type { OutsideItem, Shine, SkyForm, Tones } from '../model/types'
import { rng } from './core'
import type { Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { edgeStrips, facesOf, MIN_STOREY_PX, sideFace } from './outsideLight'

/** A box narrower than this (px) shows no window rows. */
const WINDOW_MIN_W = 1.6

/**
 * One built cell: its plaster front (lit by its own share when it faces the light), both side faces by theirs, its window
 * rows (a low sun glinting in the glass of a face turned to it), a soft shade under its eave and at its foot among the
 * others; a house its tile roof (each plane by its own share) or flat roof (with a heater on some), a block of the mass
 * its roof edge.
 */
export function paintBox(ctx: Ctx2D, b: Extract<OutsideItem, { kind: 'box' }>, t: Tones, s: Shine, lamps: Lamp[], f: SkyForm) {
  const r = rng(b.seed)
  const tint = r()
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  const fl = facesOf(s)
  const wall = mix(t.wall, t.stone, .1 + .45 * tint)
  ctx.fillStyle = css(wall)
  ctx.fillRect(x0, b.top, b.w, h)
  ctx.fillStyle = css(mix(t.lit, t.stoneLit, .3 * tint), .85 * fl.front)
  ctx.fillRect(x0, b.top, b.w, h)
  skyLight(ctx, x0, b.top, b.w, h, f, b.tier)
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
  // Window rows, a storey each: dark recesses by day (the floors' texture), a few lamps by night (the lit share); a low sun
  // catches the glass of a face turned to it.
  const storey = h / b.storeys
  const glint = fl.glint * (1 - s.night)
  const fade = Math.min(1, Math.max(0, (s.night - .6) / .2))
  if (b.w >= WINDOW_MIN_W && storey >= MIN_STOREY_PX) {
    const inner0 = x0 + face + .25, inner1 = x0 + b.w - face - .2
    for (let k = 0; k < b.storeys; k++) {
      const wy = b.top + .7 + k * storey
      if (wy + .5 > b.foot - .4) break
      for (let wx = inner0; wx + .5 <= inner1; wx += 1.25) {
        const present = r() >= .3
        const threshold = r(), catches = r() < .45, halo = r() < .12
        if (!present) continue
        const on = threshold < s.windows
        ctx.fillStyle = on ? css(mix(wall, t.win, .9)) : css(t.deep, .5 - .2 * s.night)
        ctx.fillRect(wx, wy, .55, Math.min(.6, storey * .5))
        if (!on && catches) {
          ctx.fillStyle = css(mix(t.lit, t.win, .5), .9 * glint * fl.front)
          ctx.fillRect(wx, wy, .55, Math.min(.6, storey * .5))
        }
        if (on && halo) lamps.push({ x: wx + .27, y: wy + .3, r: 1.3, c: t.win, a: .25 * s.night, fade })
      }
      // The side faces' glass: a tick of the low sun in each storey of the face turned to it.
      for (const [x, k] of [[x0 + face * .3, fl.left], [x0 + b.w - face * .7, fl.right]] as const) {
        if (r() < .5) {
          ctx.fillStyle = css(mix(t.lit, t.win, .5), glint * k)
          ctx.fillRect(x, wy, Math.max(.3, face * .4), Math.min(.6, storey * .5))
        }
      }
    }
  }
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
  const sky = mix(t.rim, f.tiers[b.tier].top, f.strength)
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

/**
 * The sky's light on a wall (`SkyForm`): lighter toward its top, which sees more of the sky, darker toward its foot among
 * the others; the side turned to the brighter half of the sky a little lighter, the other a little darker.
 */
function skyLight(ctx: Ctx2D, x0: number, top: number, w: number, h: number, f: SkyForm, tier: number) {
  if (h < 1.2) return
  const c = f.tiers[tier]
  const a = f.strength
  ctx.fillStyle = css(c.top, .8 * a)
  ctx.fillRect(x0, top, w, Math.min(h * .3, 3))
  ctx.fillStyle = css(c.top, .35 * a)
  ctx.fillRect(x0, top + Math.min(h * .3, 3), w, Math.min(h * .25, 3))
  ctx.fillStyle = css(c.foot, .75 * a)
  ctx.fillRect(x0, top + h * .6, w, h * .4)
  if (w >= 1.6) {
    edgeStrips(ctx, x0, top, w, h, Math.min(1.2, w * .32), c.face,
      .7 * a * Math.max(0, f.side), .7 * a * Math.max(0, -f.side))
  }
}
