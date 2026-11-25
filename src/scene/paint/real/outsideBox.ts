import { facadeDetail } from '../../model/buildingDetail'
import type { BuildingFaces, accessoryTones } from '../../model/buildingLight'
import type { Shine, Tones } from '../../model/types'
import { boxFaces, capDepth, topPlane } from '../shared/town/buildingFaces'
import { rng } from '../shared/base/core'
import type { Lamp } from '../shared/town/glyphs/kit'
import { mix, type Ctx2D } from '../shared/base/hand'
import { paintBoxWindows, type Box } from './outsideWindows'
import { solarHeater, tileRoof } from './outsideRoof'
import { albedoOf, alleyShade, capTone, frontForm, ownPlaster, plinth, softEdge } from './town/bodyForm'

export function paintBoxGeometry(ctx: Ctx2D, b: Box, t: Tones, s: Shine,
  f: BuildingFaces, accessories: ReturnType<typeof accessoryTones> | null, tint = 0) {
  const x0 = b.x - b.w / 2, h = b.foot - b.top
  const detail = facadeDetail(b.w, h)
  // A far block's cap fades with its facade: at a px tall its roof is no pale bar over the wall.
  const cap = detail && b.roof !== 'tile' ? capDepth(b.w, h) * Math.min(1, 3 * detail) : 0
  const enclosure = b.neighbours ?? 0
  // Paint the facade behind the top's coverage so there is no translucent
  // seam between two separately antialiased, subpixel surfaces.
  boxFaces(ctx, x0, b.top, b.w, h, f, detail, b.roof === 'tile' ? .42 : .20, enclosure)
  if (cap) topPlane(ctx, x0, b.top, b.w, cap, capTone(f))
  frontForm(ctx, x0, b.top, b.w, b.foot, f, t, s, detail, b.roof === 'tile' && !!f.tile)
  if (!cap && b.roof === 'tile' && f.tile) tileRoof(ctx, x0, b.top, b.w, f.tile, s, t, f.tileBase ?? f.tile[0], detail, f.front.wall)

  if (b.heater && b.w > 2.6 && accessories) solarHeater(ctx, x0 + b.w * (.3 + .4 * tint), b.top, accessories)
}

export function paintBox(ctx: Ctx2D, b: Box, t: Tones, s: Shine, lamps: Lamp[], faces: BuildingFaces,
  accessories: ReturnType<typeof accessoryTones> | null, scale: number) {
  const r = rng(b.seed), tint = r()
  const x0 = b.x - b.w / 2
  const own = ownPlaster(faces, albedoOf(b.seed))
  alleyShade(ctx, x0, b.top, b.w, b.foot, t, s)
  plinth(ctx, x0, b.foot, b.w, b.foot - b.top, own, t)
  softEdge(ctx, x0, b.top, b.w, b.foot, own)
  paintBoxGeometry(ctx, b, t, s, own, accessories, tint)
  const warm = mix(mix(t.wall, t.stone, .1 + .45 * tint), t.win, .9)
  paintBoxWindows(ctx, b, t, s, lamps, r, warm, faces.recess, t.win, scale)
}
