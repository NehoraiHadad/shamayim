import type { OutsideItem, RGB, Shine, Tones } from '../model/types'
import { rng } from './core'
import { aviationLamp, type Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { MIN_STOREY_PX } from './outsideLight'

export type Box = Extract<OutsideItem, { kind: 'box' }>
export type Tower = Extract<OutsideItem, { kind: 'tower' }>

export function paintBoxWindows(ctx: Ctx2D, b: Box, t: Tones, s: Shine, lamps: Lamp[], r: () => number,
  warm: RGB, recess: RGB, specular: RGB) {
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  // Keep the window grid and its seeded lamp draws independent of the facade's facing.
  const storey = h / b.storeys
  if (b.w >= 1.6 && storey >= MIN_STOREY_PX) {
    const face = Math.min(1, b.w * .26)
    const inner0 = x0 + face + .25, inner1 = x0 + b.w - face - .2
    const glint = (s.glint ?? 0) * (1 - s.night)
    const fade = Math.min(1, Math.max(0, (s.night - .6) / .2))
    for (let k = 0; k < b.storeys; k++) {
      const wy = b.top + .7 + k * storey
      if (wy + .5 > b.foot - .4) break
      for (let wx = inner0; wx + .5 <= inner1; wx += 1.25) {
        const present = r() >= .3
        const threshold = r(), catches = r() < .45, halo = r() < .12
        if (!present) continue
        const on = threshold < s.windows
        ctx.fillStyle = css(on ? warm : recess, on ? 1 : .5 - .2 * s.night)
        ctx.fillRect(wx, wy, .55, Math.min(.6, storey * .5))
        if (!on && catches && glint > 0) {
          ctx.fillStyle = css(specular, .9 * glint * s.faces.front)
          ctx.fillRect(wx, wy, .55, Math.min(.6, storey * .5))
        }
        if (on && halo) lamps.push({ x: wx + .27, y: wy + .3, r: 1.3, c: t.win, a: .25 * s.night, fade })
      }
      for (const [x, k] of [[x0 + face * .3, s.faces.left], [x0 + b.w - face * .7, s.faces.right]] as const) {
        if (r() < .5 && glint > 0) {
          ctx.fillStyle = css(specular, glint * k)
          ctx.fillRect(x, wy, Math.max(.3, face * .4), Math.min(.6, storey * .5))
        }
      }
    }
  }
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
        ctx.fillStyle = css(on ? warm : windowRecess, on ? 1 : tw.full && recess ? .3 * (1 - s.night) : 0)
        ctx.fillRect(x, y, .5, .55)
      }
    }
  }
  if (tw.full || tw.storeys >= 30) lamps.push(aviationLamp(tw.x, tipY - .4, s))
}
