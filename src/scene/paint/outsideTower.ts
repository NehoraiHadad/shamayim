import { facadeDetail } from '../model/buildingDetail'
import type { BuildingFaces } from '../model/buildingLight'
import type { OutsideItem, Shine, Tones } from '../model/types'
import { boxFaces, capDepth, topPlane } from './buildingFaces'
import type { Lamp } from './glyphs/kit'
import { css, mix, type Ctx2D } from './hand'
import { paintTowerWindows } from './outsideWindows'

type Tower = Extract<OutsideItem, { kind: 'tower' }>

export function towerSetback(tw: Tower) { return tw.crown === 1 ? Math.min(tw.h * .14, 3.5) : 0 }
export function mastHeight(tw: Tower) { return Math.min(5, 1.5 + tw.h * .08) }

export function paintTower(ctx: Ctx2D, tw: Tower, t: Tones, s: Shine, lamps: Lamp[], f: BuildingFaces, scale: number) {
  const x0 = tw.x - tw.w / 2, top = tw.base - tw.h
  const setback = towerSetback(tw), shaftTop = top + setback
  const podium = tw.full ? Math.min(2.6, tw.h * .12) : 0
  const shaftBase = tw.base - podium
  const block = (x: number, y: number, w: number, h: number) => {
    const detail = facadeDetail(w, h), cap = capDepth(w, h, scale)
    boxFaces(ctx, x, y + cap, w, h - cap, f, detail, .18)
    topPlane(ctx, x, y, w, cap, mix(f.unresolved, f.top, .50 * detail))
  }
  block(x0, shaftTop, tw.w, shaftBase - shaftTop)
  if (f.band) {
    const frequency = Math.max(1.5, tw.h / tw.storeys * 2)
    ctx.fillStyle = css(f.band, .33)
    for (let y = shaftTop + 1.2; y < shaftBase - .6; y += frequency) ctx.fillRect(x0, y, tw.w, Math.min(.45, .48 / scale))
  }
  if (podium) block(x0 - 1.1, shaftBase, tw.w + 2.2, podium)
  if (setback > 0) block(tw.x - tw.w * .31, top, tw.w * .62, setback + .2)
  let tipY = top
  if (tw.crown === 2) {
    tipY -= mastHeight(tw)
    ctx.fillStyle = css(f.front.wall)
    ctx.fillRect(tw.x - .2, tipY, .4, top - tipY)
  }
  const lit = Math.max(.5, Math.min(1.6, tw.w * (tw.full ? .3 : .24)))
  const edge = Math.max(.4, Math.min(1, tw.w * .2))
  paintTowerWindows(ctx, tw, t, s, lamps, shaftTop, tipY, f.recess, Math.max(lit, edge) * .85)
}
