import type { accessoryTones } from '../../model/buildingLight'
import type { RGB, Shine, Tones } from '../../model/types'
import { css, mix, type Ctx2D } from '../shared/base/hand'

const lum = (c: RGB) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
/** Fired clay sits darker than the lime or stone wall under it: a roof is held at most this share of its wall's value. */
const ROOF_UNDER_WALL = .8

export function tileRoof(ctx: Ctx2D, x: number, y: number, w: number, tiles: readonly [RGB, RGB, RGB], s: Shine, t: Tones, base: RGB, detail: number,
  wall?: RGB) {
  const k = wall ? Math.min(1, ROOF_UNDER_WALL * lum(wall) / Math.max(1e-3, lum(mix(base, tiles[0], detail)))) : 1
  const held = (c: RGB): RGB => [c[0] * k, c[1] * k, c[2] * k]
  const tile = [held(tiles[0]), held(tiles[1]), held(tiles[2])] as const, coarse = held(base)
  const rh = Math.min(2.2, .45 * w + .3)
  const lx = x + w * .35, rx = x + w * .65
  ctx.fillStyle = css(mix(coarse, tile[0], detail))
  ctx.beginPath()
  ctx.moveTo(x - .35, y); ctx.lineTo(lx, y - rh); ctx.lineTo(rx, y - rh); ctx.lineTo(x + w + .35, y)
  ctx.closePath()
  ctx.fill()
  for (const [colour, edge, ridge, corner] of [
    [tile[1], x - .35, lx, x + w * .27], [tile[2], x + w + .35, rx, x + w * .73],
  ] as const) {
    ctx.fillStyle = css(mix(coarse, colour, detail))
    ctx.beginPath()
    ctx.moveTo(edge, y); ctx.lineTo(ridge, y - rh); ctx.lineTo(corner, y)
    ctx.closePath()
    ctx.fill()
  }
  // A sunward glazed ridge catches a narrow specular lobe.
  const glint = (s.glint ?? 0) * s.faces.rim
  if (glint > 0) {
    ctx.fillStyle = css(t.win, .45 * glint)
    ctx.fillRect(lx, y - rh, rx - lx, .22)
  }
}

export function solarHeater(ctx: Ctx2D, x: number, top: number, shades: ReturnType<typeof accessoryTones>) {
  ctx.fillStyle = css(shades.heater)
  ctx.fillRect(x, top - .9, 1.1, .5)
  ctx.fillStyle = css(shades.panel)
  ctx.beginPath()
  ctx.moveTo(x - 1.2, top); ctx.lineTo(x - .15, top - .8); ctx.lineTo(x - .15, top)
  ctx.closePath()
  ctx.fill()
}
