import type { BuildingFaces, accessoryTones } from '../model/buildingLight'
import type { Shine, Tones } from '../model/types'
import { css, type Ctx2D } from './hand'

export function tileRoof(ctx: Ctx2D, x: number, y: number, w: number, f: BuildingFaces, s: Shine, t: Tones) {
  const rh = Math.min(2.2, .45 * w + .3)
  const lx = x + w * .35, rx = x + w * .65
  ctx.fillStyle = css(f.tile[0])
  ctx.beginPath()
  ctx.moveTo(x - .35, y); ctx.lineTo(lx, y - rh); ctx.lineTo(rx, y - rh); ctx.lineTo(x + w + .35, y)
  ctx.closePath()
  ctx.fill()
  for (const [colour, edge, ridge, corner] of [
    [f.tile[1], x - .35, lx, x + w * .27], [f.tile[2], x + w + .35, rx, x + w * .73],
  ] as const) {
    ctx.fillStyle = css(colour)
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
