import { facadeDetail } from '../../model/buildingDetail'
import { receiverMaterial } from '../../model/buildingMaterial'
import type { BuildingFaces, accessoryTones } from '../../model/buildingLight'
import type { RGB, Shine, Tones } from '../../model/types'
import { boxFaces, capDepth, topPlane } from '../shared/town/buildingFaces'
import { rng } from '../shared/base/core'
import type { Lamp } from '../shared/town/glyphs/kit'
import { mix, type Ctx2D } from '../shared/base/hand'
import { paintBoxWindows, type Box } from './outsideWindows'
import { solarHeater, tileRoof, tileTooth } from './outsideRoof'
import type { Alley } from './town/alleys'
import { albedoOf, alleyShade, capTone, dulledClay, frontForm, ownPlaster, quarryOf, seat, softEdge } from './town/bodyForm'

/** The least width (px) of a flat roof that shows its solar heater: on a smaller one it is a dot of blue, not a heater. */
const HEATER_LEAST = 6

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
  if (!cap && b.roof === 'tile' && f.tile) tileRoof(ctx, x0, b.top, b.w, f.tile, s, t, f.tileBase ?? f.tile[0], detail)

  if (b.heater && b.w > HEATER_LEAST && accessories) solarHeater(ctx, x0 + b.w * (.3 + .4 * tint), b.top, accessories, b.w, cap ? capTone(f) : f.top)
}

export function paintBox(ctx: Ctx2D, b: Box, t: Tones, s: Shine, lamps: Lamp[], faces: BuildingFaces,
  accessories: ReturnType<typeof accessoryTones> | null, scale: number, alley?: Alley, tooth?: () => void, ground?: RGB) {
  const r = rng(b.seed), tint = r()
  const x0 = b.x - b.w / 2
  const walls = { stone: s.stone ?? 0, quarry: quarryOf(b.seed), glass: receiverMaterial(b.receiver).glass ? 1 - s.night : 0 }
  const own = dulledClay(ownPlaster(faces, albedoOf(b.seed), walls), s)
  alleyShade(ctx, alley, t, s)
  softEdge(ctx, x0, b.top, b.w, b.foot, own)
  paintBoxGeometry(ctx, b, t, s, own, accessories, tint)
  if (tooth && b.roof === 'tile' && own.tile) tileTooth(ctx, x0, b.top, b.w, tooth)
  // The light's form over the geometry (the masks of the building checks take the geometry alone).
  const h = b.foot - b.top, detail = facadeDetail(b.w, h)
  frontForm(ctx, x0, b.top, b.w, b.foot, own, t, s, detail, b.roof === 'tile' && !!own.tile)
  seat(ctx, x0, b.foot, b.w, h, own, t, detail, ground)
  const warm = mix(mix(t.wall, t.stone, .1 + .45 * tint), t.win, .9)
  paintBoxWindows(ctx, b, t, s, lamps, r, warm, faces.recess, t.win, scale)
}
