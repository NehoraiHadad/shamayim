import type { OutsideItem, RGB, Shine, Tones } from '../../model/types'
import { rng } from '../shared/base/core'
import { aviationLamp, type Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import { paintPass } from '../shared/base/paintPass'

const MIN_STOREY_PX = .85
const BOX_WINDOW_WIDTH = .55
const BOX_WINDOW_INSET_TOP = .7

export type Box = Extract<OutsideItem, { kind: 'box' }>
export type Tower = Extract<OutsideItem, { kind: 'tower' }>

export function paintBoxWindows(ctx: Ctx2D, b: Box, t: Pick<Tones, 'shade' | 'deep' | 'win'>, s: Shine, lamps: Lamp[], r: () => number,
  warm: RGB, recess: RGB, specular: RGB, scale: number) {
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  // Keep the window grid and its seeded lamp draws independent of the facade's facing.
  const storey = h / b.storeys
  if (b.w >= 1.6 && storey >= MIN_STOREY_PX) {
    const face = Math.min(1, b.w * .26)
    const inner0 = x0 + face + .25, inner1 = x0 + b.w - face - .2
    const glint = (s.glint ?? 0) * (1 - s.night)
    const fade = Math.min(1, Math.max(0, (s.night - .6) / .2))
    const wh = Math.min(.6, storey * .5)
    const litTop: number[] = []
    for (let k = 0; k < b.storeys; k++) {
      const wy = b.top + BOX_WINDOW_INSET_TOP + k * storey
      if (wy + .5 > b.foot - .4) break
      for (let wx = inner0; wx + .5 <= inner1; wx += 1.25) {
        const present = r() >= .3
        const threshold = r(), catches = r() < .45, halo = r() < .12
        if (!present) continue
        const on = threshold < s.windows
        if (on) {
          emitWindow(ctx, wx, wy, BOX_WINDOW_WIDTH, wh, warm)
          if (k === 0) litTop.push(wx)
        } else {
          ctx.fillStyle = css(recess, .35 - .15 * s.night)
          ctx.fillRect(wx, wy, BOX_WINDOW_WIDTH, wh)
        }
        if (!on && catches && glint > 0) {
          ctx.fillStyle = css(specular, .9 * glint * s.faces.front)
          ctx.fillRect(wx, wy, BOX_WINDOW_WIDTH, wh)
        }
        if (on && halo) lamps.push({ x: wx + .27, y: wy + .3, r: 1.3, c: t.win, a: .25 * s.night, fade })
      }
      for (const [x, k] of [[x0 + face * .3, s.faces.left], [x0 + b.w - face * .7, s.faces.right]] as const) {
        if (r() < .5 && glint > 0) {
          ctx.fillStyle = css(specular, glint * k)
          ctx.fillRect(x, wy, Math.max(.3, face * .4), wh)
        }
      }
    }
    if (litTop.length) shadeTopWindows(ctx, b, t, s, litTop, wh, scale)
  }
}

function shadeTopWindows(ctx: Ctx2D, b: Box, t: Pick<Tones, 'shade' | 'deep'>, s: Shine, windows: number[], h: number, scale: number) {
  const tiled = b.roof === 'tile', y = b.top + BOX_WINDOW_INSET_TOP
  const floor = (v: number) => Math.floor(v * scale) / scale
  const ceil = (v: number) => Math.ceil(v * scale) / scale
  const top = floor(y), bottom = ceil(y + h)
  // Keep the eave/parapet over the lit apertures. Clip to whole raster pixels
  // so the shade keeps its original coverage on antialiased window edges.
  paintPass(ctx, 'emission', () => {
    const on = Math.min(1, Math.max(0, (s.direct - .04) / .41))
    const x0 = b.x - b.w / 2
    ctx.save()
    ctx.beginPath()
    for (const x of windows) {
      const left = floor(x)
      ctx.rect(left, top, ceil(x + BOX_WINDOW_WIDTH) - left, bottom - top)
    }
    ctx.clip()
    ctx.fillStyle = css(tiled ? t.shade : t.deep, tiled ? .5 : .35)
    ctx.fillRect(x0, b.top + (tiled ? .15 : .45), b.w, tiled ? .35 : .3)
    ctx.fillStyle = css(tiled ? t.shade : t.deep, tiled ? .18 + .17 * on : .1 + .1 * on)
    ctx.fillRect(x0, b.top + (tiled ? .5 : .75), b.w, tiled ? .45 : .4)
    ctx.restore()
  })
}

export function paintTowerWindows(ctx: Ctx2D, tw: Tower, t: Tones, s: Shine, lamps: Lamp[], shaftTop: number, tipY: number,
  windowRecess: RGB, faceW: number) {
  const x0 = tw.x - tw.w / 2
  const storey = (tw.base - shaftTop) / tw.storeys
  if (storey >= MIN_STOREY_PX * .7 && tw.w >= 2) {
    const r = rng(tw.seed * 7 + 1)
    const inner0 = x0 + faceW + .3, inner1 = x0 + tw.w - faceW - .25
    const warm = mix(t.wall, t.win, .85)
    for (let y = shaftTop + 1; y < tw.base - 1.2; y += Math.max(storey, 1.1)) {
      for (let x = inner0; x + .5 <= inner1; x += 1.1) {
        const threshold = r(), recess = r() < .55
        const on = threshold < s.windows * .8
        if (on) emitWindow(ctx, x, y, .5, .55, warm)
        else {
          ctx.fillStyle = css(windowRecess, tw.full && recess ? .25 * (1 - s.night) : 0)
          ctx.fillRect(x, y, .5, .55)
        }
      }
    }
  }
  if (tw.full || tw.storeys >= 30) lamps.push(aviationLamp(tw.x, tipY - .4, s))
}

function emitWindow(ctx: Ctx2D, x: number, y: number, w: number, h: number, warm: RGB) {
  paintPass(ctx, 'emission', () => {
    ctx.fillStyle = css(warm)
    ctx.fillRect(x, y, w, h)
  })
}
