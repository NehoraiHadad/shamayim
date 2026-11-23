import type { OutsideItem, Shine, Tones } from '../model/types'
import type { Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { paintTowerWindows } from './outsideWindows'
import { edgeStrips, facesOf, sideFace } from './outsideLight'

/**
 * A tower: a spire's silhouette (a shaft with its lit edge and shade, a crown) or, `full`, a whole tower (a podium, a
 * glass shaft brighter toward the sky, the floor bands, a lit edge on the light's side, its crown: a parapet, a setback
 * or a mast), windows lit by night, an aviation light on the tall.
 */
export function paintNightTower(ctx: Ctx2D, tw: Extract<OutsideItem, { kind: 'tower' }>, t: Tones, s: Shine, lamps: Lamp[]) {
  const day = 1 - s.night
  const x0 = tw.x - tw.w / 2, top = tw.base - tw.h
  const lit = Math.max(.5, Math.min(1.6, tw.w * (tw.full ? .3 : .24))), shadeW = Math.max(.4, Math.min(1, tw.w * .2))
  const setback = tw.crown === 1 ? Math.min(tw.h * .14, 3.5) : 0
  const shaftTop = top + setback
  if (tw.full) {
    // Podium: a wider low block at the foot.
    const pw = tw.w + 2.2, ph = Math.min(2.6, tw.h * .12)
    ctx.fillStyle = css(mix(t.wall, t.stone, .2))
    ctx.fillRect(tw.x - pw / 2, tw.base - ph, pw, ph)
    ctx.fillStyle = css(t.rim, .55 * (1 - .5 * s.night))
    ctx.fillRect(tw.x - pw / 2, tw.base - ph, pw, .4)
    // The glass shaft: brighter toward the sky it mirrors, the floor bands across it.
    const g = ctx.createLinearGradient(0, shaftTop, 0, tw.base)
    g.addColorStop(0, css(mix(t.wall, mix(t.glassLit, t.rim, .25), day)))
    g.addColorStop(1, css(mix(t.wall, mix(t.glass, t.shade, .2), day)))
    ctx.fillStyle = g
    ctx.fillRect(x0, shaftTop, tw.w, tw.base - ph - shaftTop)
    const band = Math.max(1.1, tw.h / tw.storeys * 2)
    for (let y = shaftTop + 1.2; y < tw.base - ph - .6; y += band) {
      ctx.fillStyle = css(mix(t.lit, t.wall, .6), (.32 - .16 * s.night) * day + .05)
      ctx.fillRect(x0, y, tw.w, .35)
    }
  } else {
    ctx.fillStyle = css(mix(t.wall, mix(t.glass, t.stone, .5), .35 * day))
    ctx.fillRect(x0, shaftTop, tw.w, tw.h - setback)
  }
  const fl = facesOf(s)
  const faceW = Math.max(lit, shadeW) * .85
  const litTone = mix(t.lit, t.glassLit, tw.full ? .35 : .1)
  sideFace(ctx, x0, shaftTop, faceW, tw.base - shaftTop, fl.left, fl.on, t, litTone)
  sideFace(ctx, x0 + tw.w - faceW, shaftTop, faceW, tw.base - shaftTop, fl.right, fl.on, t, litTone)
  for (const [x, k] of [[x0, fl.left], [x0 + tw.w - .4, fl.right]] as const) {
    const a = k * (.55 * s.direct + .1) + .45 * fl.rim
    ctx.fillStyle = css(mix(t.lit, t.rim, .6), Math.min(1, a))
    ctx.fillRect(x, shaftTop, .4, tw.base - shaftTop)
  }
  // Crown.
  if (setback > 0) {
    const cw = tw.w * .62
    ctx.fillStyle = css(t.wall)
    ctx.fillRect(tw.x - cw / 2, top, cw, setback + .2)
    for (const [x, k] of [[tw.x - cw / 2, fl.left], [tw.x + cw / 2 - lit * .8, fl.right]] as const) {
      ctx.fillStyle = css(t.lit, k)
      ctx.fillRect(x, top, lit * .8, setback)
    }
    ctx.fillStyle = css(t.rim, .7 * (1 - .4 * s.night))
    ctx.fillRect(tw.x - cw / 2, top, cw, .4)
  }
  ctx.fillStyle = css(mix(t.rim, mix(t.rim, t.lit, .4),
    Math.min(1, fl.top + .3 * Math.max(fl.left, fl.right) + .5 * fl.rim)), .8 * (1 - .4 * s.night))
  ctx.fillRect(x0, shaftTop, tw.w, .45)
  let tipY = top
  if (tw.crown === 2) {
    const mh = Math.min(5, 1.5 + tw.h * .08)
    ctx.fillStyle = css(t.wall)
    ctx.fillRect(tw.x - .2, top - mh, .4, mh)
    edgeStrips(ctx, tw.x - .2, top - mh, .4, mh, .2, t.lit, .8 * fl.left, .8 * fl.right)
    tipY = top - mh
  }
  paintTowerWindows(ctx, tw, t, s, lamps, shaftTop, tipY, t.deep, faceW)
}
