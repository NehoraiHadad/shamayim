import { smoothstep } from '../../domain/smoothstep'
import type { FaceTones, BuildingFaces } from '../model/buildingLight'
import { css, mix, type Ctx2D } from './hand'

/** The projected top is fixed in scene space. Raster coverage resolves the smallest caps. */
export function capDepth(w: number, h: number) {
  return Math.min(h * .32, .20 * w, .84)
}

export function topPlane(ctx: Ctx2D, x: number, y: number, w: number, depth: number, c: BuildingFaces['top']) {
  const inset = Math.min(w * .12, depth * .4)
  ctx.fillStyle = css(c)
  ctx.beginPath()
  ctx.moveTo(x + inset, y)
  ctx.lineTo(x + w - inset, y)
  ctx.lineTo(x + w, y + depth)
  ctx.lineTo(x, y + depth)
  ctx.closePath()
  ctx.fill()
}

function faceFill(ctx: Ctx2D, x: number, y: number, w: number, h: number, face: FaceTones,
  coarse: BuildingFaces['unresolved'], detail: number, eave: number, enclosure: number) {
  const wall = mix(coarse, face.wall, detail)
  const nearGround = detail * smoothstep(1.2, 2.8, h)
  const foot = .31 * enclosure * nearGround
  // Average the subpixel eave over the face. The foot only needs a gradient
  // when its resolved colour actually differs from the wall.
  const ink = css(mix(wall, face.eave, .15 * nearGround * eave * Math.min(.3, eave / h)))
  const footInk = foot ? css(mix(wall, face.foot, foot)) : ink
  if (footInk === ink) ctx.fillStyle = ink
  else {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(.67, ink)
    g.addColorStop(1, footInk)
    ctx.fillStyle = g
  }
  ctx.fillRect(x, y, w, h)
}

export function boxFaces(ctx: Ctx2D, x: number, y: number, w: number, h: number, faces: BuildingFaces,
  detail: number, eave: number, enclosure = 0) {
  const coarse = faces.unresolved
  if (!detail) {
    ctx.fillStyle = css(coarse)
    ctx.fillRect(x, y, w, h)
    return
  }
  const left = Math.min(1.9, w * faces.leftWidth), right = Math.min(1.9, w * faces.rightWidth)
  // The front underdraw closes antialias seams at fractional facet boundaries.
  faceFill(ctx, x, y, w, h, faces.front, coarse, detail, eave, enclosure)
  faceFill(ctx, x, y, left, h, faces.left, coarse, .64 * detail, eave, enclosure)
  faceFill(ctx, x + w - right, y, right, h, faces.right, coarse, .64 * detail, eave, enclosure)
}
