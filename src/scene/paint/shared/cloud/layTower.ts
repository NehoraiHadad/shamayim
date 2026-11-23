import type { RGB } from '../../../../world/types'
import type { CloudSprite } from '../../../model/cloudSprite'
import type { Ctx2D, PaintEnv } from '../base/hand'

/* A tower laid as a raster on a scratch sheet, stretched with the canvas's own smoothing. */

/** Opacity of the thickest tower; optical depth over which a thin one comes up to it. */
const OPACITY = 0.92, TAU_FULL = 6
/** Raster px per sky px at most, and raster px in a tower at most (a near giant is soft anyway). */
const RASTER = 0.7, RASTER_PX = 10_000
/** Room over the crown for the noise, against the width. */
const ROOM_TOP = 0.25

/** A hand's tower: its base's depth, how far it reaches from its middle, and its alpha and colour at a point (sprite px). */
export interface TowerBody {
  depth: number
  reach: number
  at(x: number, y: number): { a: number; rgb: Readonly<RGB> } | null
}

/** Lays a tower's raster at its place: the size and opacity both hands share. */
export function layTower(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv, bodyOf: (s: CloudSprite) => TowerBody): void {
  if (s.w < 0.5 || s.share <= 0.005 || s.tall < 0.5) return
  const opacity = OPACITY * (1 - Math.exp(-s.tau / TAU_FULL * 3)) * Math.min(1, s.share)
  const body = bodyOf(s)
  const { reach } = body, over = s.w * ROOM_TOP
  const box = { x: -reach, y: -s.tall - over, w: 2 * reach, h: s.tall + over + body.depth * 1.5 }
  const k = Math.min(RASTER, Math.sqrt(RASTER_PX / (box.w * box.h)))
  const w = Math.max(2, Math.ceil(box.w * k)), h = Math.max(2, Math.ceil(box.h * k))
  const sheet = env.canvas(w, h)
  const image = sheet.ctx.createImageData(w, h)
  for (let j = 0, at = 0; j < h; j++) {
    const py = box.y + ((j + 0.5) / h) * box.h
    for (let i = 0; i < w; i++, at += 4) {
      const px = box.x + ((i + 0.5) / w) * box.w
      const here = body.at(px, py)
      if (!here) continue
      for (let n = 0; n < 3; n++) image.data[at + n] = Math.round(Math.min(1, Math.max(0, here.rgb[n])) * 255)
      image.data[at + 3] = Math.round(here.a * 255)
    }
  }
  sheet.ctx.putImageData(image, 0, 0)
  c.save()
  c.globalAlpha *= opacity
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  c.drawImage(sheet.canvas as CanvasImageSource, x + box.x, y + box.y, box.w, box.h)
  c.restore()
}
