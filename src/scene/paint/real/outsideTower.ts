import { facadeDetail } from '../../model/buildingDetail'
import type { BuildingFaces } from '../../model/buildingLight'
import type { OutsideItem, Shine, Tones } from '../../model/types'
import { boxFaces, capDepth, topPlane } from '../shared/town/buildingFaces'
import type { Lamp } from '../shared/town/glyphs/kit'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import { paintTowerWindows } from './outsideWindows'
import type { Alley } from './town/alleys'
import { albedoOf, alleyShade, capTone, frontForm, ownPlaster, seat } from './town/bodyForm'

type Tower = Extract<OutsideItem, { kind: 'tower' }>

export function towerSetback(tw: Tower) { return tw.crown === 1 ? Math.min(tw.h * .14, 3.5) : 0 }
function mastHeight(tw: Tower) { return Math.min(5, 1.5 + tw.h * .08) }

export function paintTower(ctx: Ctx2D, tw: Tower, t: Tones, s: Shine, lamps: Lamp[], faces: BuildingFaces, scale: number,
  alley?: Alley) {
  const x0 = tw.x - tw.w / 2, top = tw.base - tw.h
  const setback = towerSetback(tw), shaftTop = top + setback
  const podium = tw.full ? Math.min(2.6, tw.h * .12) : 0
  const shaftBase = tw.base - podium
  const f = ownPlaster(faces, albedoOf(tw.seed))
  const block = (x: number, y: number, w: number, h: number) => {
    const detail = facadeDetail(w, h), cap = capDepth(w, h)
    boxFaces(ctx, x, y, w, h, f, detail, .18)
    topPlane(ctx, x, y, w, cap, mix(capTone(f), f.front.wall, .2))
    frontForm(ctx, x, y, w, y + h, f, t, s, detail, false)
  }
  alleyShade(ctx, alley, t, s)
  block(x0, shaftTop, tw.w, shaftBase - shaftTop)
  if (f.band) {
    const frequency = Math.max(1.5, tw.h / tw.storeys * 2)
    ctx.fillStyle = css(f.band, .33)
    for (let y = shaftTop + 1.2; y < shaftBase - .6; y += frequency) ctx.fillRect(x0, y, tw.w, Math.min(.45, .48 / scale))
  }
  if (podium) block(x0 - 1.1, shaftBase, tw.w + 2.2, podium)
  if (setback > 0) block(tw.x - tw.w * .31, top, tw.w * .62, setback + .2)
  seat(ctx, x0 - (podium ? 1.1 : 0), tw.base, tw.w + (podium ? 2.2 : 0), tw.h, f, t, facadeDetail(tw.w, tw.h))
  let tipY = top
  if (tw.crown === 2) {
    tipY -= mastHeight(tw)
    ctx.fillStyle = css(faces.front.wall)
    ctx.fillRect(tw.x - .2, tipY, .4, top - tipY)
  }
  const lit = Math.max(.5, Math.min(1.6, tw.w * (tw.full ? .3 : .24)))
  const edge = Math.max(.4, Math.min(1, tw.w * .2))
  paintTowerWindows(ctx, tw, t, s, lamps, shaftTop, tipY, faces.recess, Math.max(lit, edge) * .85)
}
