import type { LayerOf, OutsideItem, RGB, SeaDesc, Shine, SkyForm, Tones } from '../model/types'
import { rng } from './core'
import { drawGlyph, drawLamps, glyphShadow, glyphLight } from './glyphs'
import { AVIATION, type Lamp } from './glyphs/kit'
import { css, mix, outline, type Ctx2D, type PaintEnv } from './hand'
import { grain, rockOf, tree } from './marks'
import { running, twinkling } from './water'

/*
 * The place seen from outside (stage C5, variant B) in the enriched hand.
 * REFERENCE looked at: the skyline study's B stills (docs/design/qa/true-scene/skyline/telaviv-1630.png, haifa-1100.png:
 * the dense mass with spires and named towers out of it), v1b's Haifa (docs/design/qa/styles/v1b/hero.png: a city on its
 * hill as small stone boxes with a lit face, dark window rows, a few towers), and photographs of Tel Aviv's and Haifa's
 * skylines from the north at dusk (towers as glass shafts with a bright edge on the sun's side, the low city a mottle of
 * pale blocks under them, window rows as fine horizontal texture, red lights on the tall tops by night).
 * C5b: the place's own ground under it (its hill over the ridge line), the sea out to its horizon, the sky's light on the
 * mass under any cloud (tops lighter, feet darker, the face to the brighter sky).
 * MEDIUM: the scene's flat opaque bodies cut from the ridge colour, hard edges, no outline; one light: the face toward
 * the true sun lit, the other in shade; haze in the tones (by row); a mass is many boxes, each its own plaster, its roof
 * edge catching the sky. ORDER: the coastal sea (wash down the band, ripples, the shore, the light's path) → the cast
 * shadows of towers and marks → the bodies back to front (beyond the place, then the place by where it stands) → the
 * grain over all → lamps and halos (windows lit by night, aviation lights), which no grain dulls.
 * Screen px. Pure: randomness only from the items' seeds.
 */

/** A box narrower than this (px) shows no window rows; a storey must be this tall (px). */
const WINDOW_MIN_W = 1.6
const MIN_STOREY_PX = .85

function sea(ctx: Ctx2D, s: SeaDesc, shine: Shine, t: number) {
  const g = ctx.createLinearGradient(0, s.top, 0, s.bottom)
  for (const [t, c] of s.stops) g.addColorStop(t, css(c))
  outline(ctx, s.points)
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  outline(ctx, s.points)
  ctx.clip()
  // Ripples: light ones catching the low sky, a darker trough under each.
  // C7: each runs a little downwind over the loop, rising and falling as it goes.
  for (const r of running(s.ripples, t, s.drift ?? 0, 0)) {
    ctx.fillStyle = css(s.light, r.alpha * (1 - .5 * shine.night))
    ctx.fillRect(r.x, r.y - .25, r.w, .4)
    ctx.fillStyle = css(s.dark, r.alpha * .8)
    ctx.fillRect(r.x + .3, r.y + .2, r.w * .8, .35)
  }
  if (s.glint) {
    const { x, rgb, alpha } = s.glint
    const core = ctx.createLinearGradient(x - 3, 0, x + 3, 0)
    core.addColorStop(0, css(rgb, 0))
    core.addColorStop(.5, css(rgb, .35 * alpha))
    core.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = core
    ctx.fillRect(x - 3, s.top, 6, s.bottom - s.top)
    for (const sp of twinkling(s.glint.sparks, t)) {
      ctx.fillStyle = css(rgb, sp.alpha)
      ctx.fillRect(sp.x, sp.y - .2, sp.w, .45)
    }
  }
  ctx.restore()
  // The horizon: the far water mirroring the sky at grazing angle, a fine light line, level.
  const hz = s.horizon
  ctx.fillStyle = css(hz.rgb, hz.alpha * (1 - .5 * shine.night))
  ctx.fillRect(hz.x0, hz.y - .25, hz.x1 - hz.x0, .5)
  // The shore: a fine pale line where the land meets the water, broken where the sea's edge turns.
  ctx.strokeStyle = css(s.shore, .7 - .35 * shine.night)
  ctx.lineWidth = .55
  ctx.beginPath()
  s.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

/** The place's own ground over the ridge line: the near land's tone, its crest catching the sky as the ridge's does. */
function land(ctx: Ctx2D, l: NonNullable<LayerOf<'outside'>['land']>, shine: Shine) {
  ctx.beginPath()
  l.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  for (let i = l.base.length - 1; i >= 0; i--) ctx.lineTo(l.base[i][0], l.base[i][1])
  ctx.closePath()
  ctx.fillStyle = css(l.tone)
  ctx.fill()
  // Snow where its crest stands at or over the snow line, as the ridge under it takes it: from the crest down to the line.
  for (const [a, b] of l.snow?.runs ?? []) {
    ctx.beginPath()
    ctx.moveTo(l.top[a][0], l.top[a][1])
    for (let i = a + 1; i <= b; i++) ctx.lineTo(l.top[i][0], l.top[i][1])
    for (let i = b; i >= a; i--) ctx.lineTo(l.base[i][0], l.base[i][1])
    ctx.closePath()
    ctx.fillStyle = css(l.snow!.rgb, l.snow!.alpha)
    ctx.fill()
  }
  // The crest: a fine line where it stands over the ridge line, fading where it eases into it.
  for (let i = 1; i < l.top.length; i++) {
    const [x0, y0] = l.top[i - 1], [x1, y1] = l.top[i]
    const rise = Math.min(1, (l.base[i][1] - 2 - y1) / 2)
    if (rise <= 0) continue
    ctx.strokeStyle = css(l.rim, .55 * rise * (1 - .5 * shine.night))
    ctx.lineWidth = .5
    ctx.beginPath()
    ctx.moveTo(x0, y0 + .25)
    ctx.lineTo(x1, y1 + .25)
    ctx.stroke()
  }
}

/** A box's face light and the direct share used for shading. */
function facesOf(s: Shine) {
  const on = Math.min(1, Math.max(0, (s.direct - 0.04) / 0.41))
  return { ...s.faces, on, glint: s.glint ?? 0 }
}

/**
 * One side face of a box or tower, `w` px of the edge at `x`: turned from the eye, it sees less of the sky than the front
 * (a light shade under an even sky, deeper as the direct light comes and leaves it), and takes the lit tone by its share
 * of the light. The same on both sides, so the lit side turns with the light and never flips.
 */
function sideFace(ctx: Ctx2D, x: number, top: number, w: number, h: number, k: number, on: number, t: Tones, lit: RGB) {
  ctx.fillStyle = css(t.shade, (0.3 + 0.35 * on) * (1 - k))
  ctx.fillRect(x, top, w, h)
  if (k > 0.004) {
    ctx.fillStyle = css(lit, k)
    ctx.fillRect(x, top, w, h)
  }
}

/**
 * One built cell: its plaster front (lit by its own share when it faces the light), both side faces by theirs, its window
 * rows (a low sun glinting in the glass of a face turned to it), a soft shade under its eave and at its foot among the
 * others; a house its tile roof (each plane by its own share) or flat roof (with a heater on some), a block of the mass
 * its roof edge.
 */
function box(ctx: Ctx2D, b: Extract<OutsideItem, { kind: 'box' }>, t: Tones, s: Shine, lamps: Lamp[], f: SkyForm) {
  const r = rng(b.seed)
  const tint = r()
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  const fl = facesOf(s)
  const wall = mix(t.wall, t.stone, .1 + .45 * tint)
  ctx.fillStyle = css(wall)
  ctx.fillRect(x0, b.top, b.w, h)
  if (fl.front > .004) {
    ctx.fillStyle = css(mix(t.lit, t.stoneLit, .3 * tint), .85 * fl.front)
    ctx.fillRect(x0, b.top, b.w, h)
  }
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
  if (b.w >= WINDOW_MIN_W && storey >= MIN_STOREY_PX) {
    const inner0 = x0 + face + .25, inner1 = x0 + b.w - face - .2
    for (let k = 0; k < b.storeys; k++) {
      const wy = b.top + .7 + k * storey
      if (wy + .5 > b.foot - .4) break
      for (let wx = inner0; wx + .5 <= inner1; wx += 1.25) {
        if (r() < .3) continue
        const on = r() < s.windows
        const catches = r()
        ctx.fillStyle = on ? css(mix(wall, t.win, .9)) : css(t.deep, .5 - .2 * s.night)
        ctx.fillRect(wx, wy, .55, Math.min(.6, storey * .5))
        if (!on && catches < .45 && glint * fl.front > .02) {
          ctx.fillStyle = css(mix(t.lit, t.win, .5), .9 * glint * fl.front)
          ctx.fillRect(wx, wy, .55, Math.min(.6, storey * .5))
        }
        if (on && s.night > .6 && r() < .12) lamps.push({ x: wx + .27, y: wy + .3, r: 1.3, c: t.win, a: .25 * s.night })
      }
      // The side faces' glass: a tick of the low sun in each storey of the face turned to it.
      for (const [x, k] of [[x0 + face * .3, fl.left], [x0 + b.w - face * .7, fl.right]] as const) {
        if (glint * k > .03 && r() < .5) {
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
      if (a <= .01) continue
      ctx.fillStyle = css(t.roofLit, a)
      ctx.beginPath()
      if (dir > 0) { ctx.moveTo(x0 - .35, b.top + .15); ctx.lineTo(x0 + b.w * .35, b.top - rh); ctx.lineTo(x0 + b.w * .5, b.top - rh); ctx.lineTo(x0 + b.w * .3, b.top + .15) }
      else { ctx.moveTo(x1 + .35, b.top + .15); ctx.lineTo(x0 + b.w * .65, b.top - rh); ctx.lineTo(x0 + b.w * .5, b.top - rh); ctx.lineTo(x0 + b.w * .7, b.top + .15) }
      ctx.closePath()
      ctx.fill()
    }
    // A back-lit roof: its ridge line catches the light beyond.
    if (fl.rim > .02) {
      ctx.fillStyle = css(t.rim, .7 * fl.rim)
      ctx.fillRect(x0 + b.w * .35, b.top - rh, b.w * .3, .3)
    }
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
  if (f.strength <= .02 || h < 1.2) return
  const c = f.tiers[tier]
  const a = f.strength
  ctx.fillStyle = css(c.top, .8 * a)
  ctx.fillRect(x0, top, w, Math.min(h * .3, 3))
  ctx.fillStyle = css(c.top, .35 * a)
  ctx.fillRect(x0, top + Math.min(h * .3, 3), w, Math.min(h * .25, 3))
  ctx.fillStyle = css(c.foot, .75 * a)
  ctx.fillRect(x0, top + h * .6, w, h * .4)
  if (f.side && w >= 1.6) {
    // The face toward the brighter half of the sky, by how far the sun's part of it stands to that side.
    const fw = Math.min(1.2, w * .32)
    ctx.fillStyle = css(c.face, .7 * a * Math.abs(f.side))
    ctx.fillRect(f.side > 0 ? x0 : x0 + w - fw, top, fw, h)
  }
}

/** A tower's cast shadow on what stands in front of it, away from the light, and its contact shade. */
function towerShadow(ctx: Ctx2D, tw: Extract<OutsideItem, { kind: 'tower' }>, t: Tones, s: Shine) {
  ctx.fillStyle = css(t.deep, .5)
  ctx.fillRect(tw.x - tw.w / 2 - .2, tw.base - .3, tw.w + .4, .8)
  if (s.cast.alpha <= .01 || !s.cast.dx) return
  const dir = Math.sign(s.cast.dx)
  // Its run across the screen is the across part of the light's (a light ahead or behind casts it toward or from the eye).
  const reach = Math.min(14, s.cast.length * tw.h * .6 * Math.min(1, Math.abs(s.cast.dx) * 1.6) + 1)
  const from = tw.x + dir * (tw.w / 2 - .5), to = tw.x + dir * (tw.w / 2 + reach)
  const g = ctx.createLinearGradient(from, 0, to, 0)
  g.addColorStop(0, css(t.shade, .8 * s.cast.alpha))
  g.addColorStop(1, css(t.shade, 0))
  ctx.beginPath()
  ctx.moveTo(tw.x - dir * (tw.w / 2 - .5), tw.base)
  ctx.lineTo(tw.x + dir * tw.w / 2, tw.base - .3)
  ctx.lineTo(to, tw.base + .5)
  ctx.lineTo(to - dir * 1.2, tw.base + 1.2)
  ctx.lineTo(tw.x - dir * (tw.w / 2 - .5), tw.base + 1.2)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

/**
 * A tower: a spire's silhouette (a shaft with its lit edge and shade, a crown) or, `full`, a whole tower (a podium, a
 * glass shaft brighter toward the sky, the floor bands, a lit edge on the light's side, its crown: a parapet, a setback
 * or a mast), windows lit by night, an aviation light on the tall.
 */
function tower(ctx: Ctx2D, tw: Extract<OutsideItem, { kind: 'tower' }>, t: Tones, s: Shine, lamps: Lamp[], f: SkyForm) {
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
  if (f.strength > .02) {
    // The sky's light down the shaft: brighter toward the top, which sees the most of it; the foot shaded by the mass.
    const c = f.tiers[tw.tier]
    const g = ctx.createLinearGradient(0, shaftTop, 0, tw.base)
    g.addColorStop(0, css(c.top, .75 * f.strength))
    g.addColorStop(.45, css(c.top, 0))
    g.addColorStop(.7, css(c.foot, 0))
    g.addColorStop(1, css(c.foot, .7 * f.strength))
    ctx.fillStyle = g
    ctx.fillRect(x0, shaftTop, tw.w, tw.base - shaftTop)
    if (f.side) {
      const fw = Math.max(.5, Math.min(1.5, tw.w * .28))
      ctx.fillStyle = css(c.face, .75 * f.strength * Math.abs(f.side))
      ctx.fillRect(f.side > 0 ? x0 : x0 + tw.w - fw, shaftTop, fw, tw.base - shaftTop)
    }
  }
  // Each side face by its own share of the light, its outer edge catching it (a fine bright line, as glass and stone
  // corners do); a back-lit tower's edges both catch the light beyond it.
  const fl = facesOf(s)
  const faceW = Math.max(lit, shadeW) * .85
  const litTone = mix(t.lit, t.glassLit, tw.full ? .35 : .1)
  sideFace(ctx, x0, shaftTop, faceW, tw.base - shaftTop, fl.left, fl.on, t, litTone)
  sideFace(ctx, x0 + tw.w - faceW, shaftTop, faceW, tw.base - shaftTop, fl.right, fl.on, t, litTone)
  for (const [x, k] of [[x0, fl.left], [x0 + tw.w - .4, fl.right]] as const) {
    const a = k * (.55 * s.direct + .1) + .45 * fl.rim
    if (a <= .01) continue
    ctx.fillStyle = css(mix(t.lit, t.rim, .6), Math.min(1, a))
    ctx.fillRect(x, shaftTop, .4, tw.base - shaftTop)
  }
  // Crown.
  if (setback > 0) {
    const cw = tw.w * .62
    ctx.fillStyle = css(t.wall)
    ctx.fillRect(tw.x - cw / 2, top, cw, setback + .2)
    for (const [x, k] of [[tw.x - cw / 2, fl.left], [tw.x + cw / 2 - lit * .8, fl.right]] as const) {
      if (k <= .01) continue
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
    const mk = Math.max(fl.left, fl.right)
    if (mk > .01) { ctx.fillStyle = css(t.lit, .8 * mk); ctx.fillRect(fl.left >= fl.right ? tw.x - .2 : tw.x, top - mh, .2, mh) }
    tipY = top - mh
  }
  // Windows: a grid of recesses on the full towers by day; by night the lit share on every tower.
  const storey = (tw.base - shaftTop) / tw.storeys
  if (storey >= MIN_STOREY_PX * .7 && tw.w >= 2) {
    const inner0 = x0 + faceW + .3, inner1 = x0 + tw.w - faceW - .25
    const step = Math.max(storey, 1.1)
    for (let y = shaftTop + 1; y < tw.base - 1.2; y += step) {
      for (let x = inner0; x + .5 <= inner1; x += 1.1) {
        const on = r() < s.windows * .8
        if (on) ctx.fillStyle = css(mix(t.wall, t.win, .85))
        else if (tw.full && r() < .55) ctx.fillStyle = css(t.deep, .3 * day)
        else continue
        ctx.fillRect(x, y, .5, .55)
      }
    }
  }
  if (s.aviation && (tw.full || tw.storeys >= 30)) lamps.push({ x: tw.x, y: tipY - .4, r: 1.3, c: AVIATION, a: .5 + .5 * s.night })
}

/** The place seen from outside, back to front. */
export function paintOutside(ctx: Ctx2D, desc: LayerOf<'outside'>, env: PaintEnv): void {
  const { shine: s, tiers } = desc
  const lateralLight = glyphLight(s)
  const frames = desc.animated?.frames
  const t = frames ? (((env.phase * frames.fps) / frames.count) % 1 + 1) % 1 : 0
  if (desc.land) land(ctx, desc.land, s)
  if (desc.sea) sea(ctx, desc.sea, s, t)
  for (const item of desc.items) {
    if (item.kind === 'tower') towerShadow(ctx, item, tiers[item.tier], s)
    else if (item.kind === 'mark') glyphShadow(ctx, item.glyph, s)
  }
  const lamps: Lamp[] = []
  for (const item of desc.items) {
    if (item.kind === 'box') box(ctx, item, tiers[item.tier], s, lamps, desc.form)
    else if (item.kind === 'tower') tower(ctx, item, tiers[item.tier], s, lamps, desc.form)
    else if (item.kind === 'tree') {
      tree(ctx, item.tree, tiers[item.tier], s, lateralLight, rockOf(desc, env, item.tree.seed))
    }
    else lamps.push(...drawGlyph(ctx, item.glyph, s))
  }
  grain(ctx, env, 13, 1 - .4 * s.night)
  drawLamps(ctx, lamps, 1 / env.scale)
}
