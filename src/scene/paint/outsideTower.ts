import type { OutsideItem, Shine, SkyForm, Tones } from '../model/types'
import { rng } from './core'
import { AVIATION, type Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { edgeStrips, facesOf, MIN_STOREY_PX, sideFace } from './outsideLight'

/**
 * A tower: a spire's silhouette (a shaft with its lit edge and shade, a crown) or, `full`, a whole tower (a podium, a
 * glass shaft brighter toward the sky, the floor bands, a lit edge on the light's side, its crown: a parapet, a setback
 * or a mast), windows lit by night, an aviation light on the tall.
 */
export function paintTower(ctx: Ctx2D, tw: Extract<OutsideItem, { kind: 'tower' }>, t: Tones, s: Shine, lamps: Lamp[], f: SkyForm) {
  const r = rng(tw.seed * 7 + 1)
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
  // The sky's light down the shaft: brighter toward the top, which sees the most of it; the foot shaded by the mass.
  const c = f.tiers[tw.tier]
  const g = ctx.createLinearGradient(0, shaftTop, 0, tw.base)
  g.addColorStop(0, css(c.top, .75 * f.strength))
  g.addColorStop(.45, css(c.top, 0))
  g.addColorStop(.7, css(c.foot, 0))
  g.addColorStop(1, css(c.foot, .7 * f.strength))
  ctx.fillStyle = g
  ctx.fillRect(x0, shaftTop, tw.w, tw.base - shaftTop)
  const fw = Math.max(.5, Math.min(1.5, tw.w * .28))
  edgeStrips(ctx, x0, shaftTop, tw.w, tw.base - shaftTop, fw, c.face,
    .75 * f.strength * Math.max(0, f.side), .75 * f.strength * Math.max(0, -f.side))
  // Each side face by its own share of the light, its outer edge catching it (a fine bright line, as glass and stone
  // corners do); a back-lit tower's edges both catch the light beyond it.
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
  ctx.fillStyle = css(mix(mix(t.rim, f.tiers[tw.tier].top, f.strength), mix(t.rim, t.lit, .4),
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
  // Windows: a grid of recesses on the full towers by day; by night the lit share on every tower.
  const storey = (tw.base - shaftTop) / tw.storeys
  if (storey >= MIN_STOREY_PX * .7 && tw.w >= 2) {
    const inner0 = x0 + faceW + .3, inner1 = x0 + tw.w - faceW - .25
    const step = Math.max(storey, 1.1)
    for (let y = shaftTop + 1; y < tw.base - 1.2; y += step) {
      for (let x = inner0; x + .5 <= inner1; x += 1.1) {
        const threshold = r(), recess = r() < .55
        if (threshold < s.windows * .8) ctx.fillStyle = css(mix(t.wall, t.win, .85))
        else ctx.fillStyle = css(t.deep, tw.full && recess ? .3 * day : 0)
        ctx.fillRect(x, y, .5, .55)
      }
    }
  }
  if (s.aviation && (tw.full || tw.storeys >= 30)) lamps.push({ x: tw.x, y: tipY - .4, r: 1.3, c: AVIATION, a: .5 + .5 * s.night })
}
