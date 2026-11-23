import type { FaceTones, BuildingFaces } from '../model/buildingLight'
import { css, mix, type Ctx2D } from './hand'

/** Keep cap coverage inside the roofline. Subpixel blocks retain a thin projected top. */
export function capDepth(w: number, h: number, scale: number) {
  return Math.min(h * .38, Math.max(.48 / scale, Math.min(.98, .18 * w)))
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

function faceFill(ctx: Ctx2D, x: number, y: number, w: number, h: number, face: FaceTones, eave: number, foot: number, enclosure: number) {
  const wall = enclosure ? mix(face.wall, face.foot, enclosure) : face.wall
  if (!eave && !foot) {
    ctx.fillStyle = css(wall)
  } else if (h < 1.5) {
    ctx.fillStyle = css(mix(wall, face.foot, Math.min(.42, foot / h * .45)))
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, css(eave ? mix(face.eave, face.foot, enclosure) : wall))
    g.addColorStop(Math.min(.32, eave / h), css(wall))
    g.addColorStop(1 - Math.min(.73, foot / h), css(wall))
    g.addColorStop(1, css(foot ? face.foot : wall))
    ctx.fillStyle = g
  }
  ctx.fillRect(x, y, w, h)
}

export function faceWidths(w: number, faces: BuildingFaces) {
  return [Math.min(1.9, w * faces.leftWidth), Math.min(1.9, w * faces.rightWidth)] as const
}

export function boxFaces(ctx: Ctx2D, x: number, y: number, w: number, h: number, faces: BuildingFaces, eave: number, foot: number, enclosure = 0) {
  const [left, right] = faceWidths(w, faces)
  // The front underdraw closes antialias seams at fractional facet boundaries.
  faceFill(ctx, x, y, w, h, faces.front, eave, foot, enclosure)
  faceFill(ctx, x, y, left, h, faces.left, eave, foot, enclosure)
  faceFill(ctx, x + w - right, y, right, h, faces.right, eave, foot, enclosure)
}
