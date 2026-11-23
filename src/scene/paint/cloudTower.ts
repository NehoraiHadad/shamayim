import type { CloudSprite } from './cloudSprite'
import type { Ctx2D, PaintEnv } from './hand'
import { towerShape } from './towerShape'
import { towerTone } from './towerTone'

/*
 * A tower (Cu con, Cg, Cb) in the sheets' soft hand (the owner's call, 22 Nov: soft and translucent, not cardboard): one
 * mass, its alpha from `towerShape` and its colour from `towerTone`, laid as a raster on a scratch sheet and stretched
 * with the canvas's own smoothing. No puffs, outlines or filter; seeded by the cell. Pure: the sprite, its place and the
 * scratch surface from `env`.
 */

/** Opacity of the thickest tower; optical depth over which a thin one comes up to it. */
const OPACITY = 0.92, TAU_FULL = 6
/** Raster px per sky px at most, and raster px in a tower at most (a near giant is soft anyway). */
const RASTER = 0.7, RASTER_PX = 10_000
/** Room across for the noise and a wide anvil, against the width on each side; room over the crown. */
const ROOM = 0.8, ROOM_ANVIL = 1.35, ROOM_TOP = 0.25

export function paintTower(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv): void {
  if (s.w < 0.5 || s.share <= 0.005 || s.tall < 0.5) return
  const opacity = OPACITY * (1 - Math.exp(-s.tau / TAU_FULL * 3)) * Math.min(1, s.share)
  const shape = towerShape(s)
  const reach = s.w * (ROOM + (ROOM_ANVIL - ROOM) * (s.anvil ?? 0)), over = s.w * ROOM_TOP
  const box = { x: -reach, y: -s.tall - over, w: 2 * reach, h: s.tall + over + shape.depth * 1.5 }
  const k = Math.min(RASTER, Math.sqrt(RASTER_PX / (box.w * box.h)))
  const w = Math.max(2, Math.ceil(box.w * k)), h = Math.max(2, Math.ceil(box.h * k))
  const sheet = env.canvas(w, h)
  const image = sheet.ctx.createImageData(w, h)
  const tone = towerTone(s, shape)
  for (let j = 0, at = 0; j < h; j++) {
    const py = box.y + ((j + 0.5) / h) * box.h
    for (let i = 0; i < w; i++, at += 4) {
      const px = box.x + ((i + 0.5) / w) * box.w
      const here = shape.at(px, py)
      if (!here) continue
      const rgb = tone(px, py, here.bump)
      for (let n = 0; n < 3; n++) image.data[at + n] = Math.round(Math.min(1, Math.max(0, rgb[n])) * 255)
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
