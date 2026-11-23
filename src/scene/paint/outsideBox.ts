import type { BuildingFaces, accessoryTones } from '../model/buildingLight'
import type { Shine, Tones } from '../model/types'
import { boxFaces, capDepth, topPlane } from './buildingFaces'
import { rng } from './core'
import type { Lamp } from './glyphs/kit'
import { mix, type Ctx2D } from './hand'
import { paintBoxWindows, type Box } from './outsideWindows'
import { solarHeater, tileRoof } from './outsideRoof'

export function paintBoxGeometry(ctx: Ctx2D, b: Box, t: Tones, s: Shine,
  f: BuildingFaces, accessories: ReturnType<typeof accessoryTones>, scale: number, tint = 0) {
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  const cap = b.roof === 'tile' ? 0 : capDepth(b.w, h, scale)
  const enclosure = b.neighbours ?? 0
  boxFaces(ctx, x0, b.top + cap, b.w, h - cap, f, b.roof === 'tile' ? .58 : .30, Math.min(3.3, h * .83) * enclosure, .26 * enclosure)
  if (cap) topPlane(ctx, x0, b.top, b.w, cap, f.top)
  else tileRoof(ctx, x0, b.top, b.w, f, s, t)

  if (b.heater && b.w > 2.6) solarHeater(ctx, x0 + b.w * (.3 + .4 * tint), b.top, accessories)
}

export function paintBox(ctx: Ctx2D, b: Box, t: Tones, s: Shine, lamps: Lamp[], faces: BuildingFaces,
  accessories: ReturnType<typeof accessoryTones>, scale: number) {
  const r = rng(b.seed), tint = r()
  paintBoxGeometry(ctx, b, t, s, faces, accessories, scale, tint)
  const warm = mix(mix(t.wall, t.stone, .1 + .45 * tint), t.win, .9)
  paintBoxWindows(ctx, b, t, s, lamps, r, warm, faces.recess, t.win)
}
