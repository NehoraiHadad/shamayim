import type { Ctx2D } from '../hand'

export type Tracer = (c: Ctx2D) => void

export const poly = (pts: readonly number[]): Tracer => (c) => {
  c.beginPath()
  c.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1])
  c.closePath()
}
export const rect = (x: number, y: number, w: number, h: number): Tracer => (c) => { c.beginPath(); c.rect(x, y, w, h) }
/** An arched opening: a rectangle with a round head, standing on `y` (its sill). */
export const arch = (x: number, y: number, w: number, h: number): Tracer => (c) => {
  const r = w / 2
  c.beginPath()
  c.moveTo(x, y)
  c.lineTo(x, y - h + r)
  c.arc(x + r, y - h + r, r, Math.PI, 0)
  c.lineTo(x + w, y)
  c.closePath()
}
export const disc = (x: number, y: number, r: number): Tracer => (c) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2) }
