import type { BuildingFaces } from '../model/buildingLight'
import type { OutsideItem, Shine, Tones } from '../model/types'
import { boxFaces, capDepth, topPlane } from './buildingFaces'
import type { Lamp } from './glyphs/kit'
import { css, type Ctx2D } from './hand'
import { paintTowerWindows } from './outsideWindows'

type Tower = Extract<OutsideItem, { kind: 'tower' }>

export function towerSetback(tw: Tower) { return tw.crown === 1 ? Math.min(tw.h * .14, 3.5) : 0 }
export function mastHeight(tw: Tower) { return Math.min(5, 1.5 + tw.h * .08) }

export function paintTower(ctx: Ctx2D, tw: Tower, t: Tones, s: Shine, lamps: Lamp[], f: BuildingFaces, scale: number) {
  const x0 = tw.x - tw.w / 2, top = tw.base - tw.h
  const setback = towerSetback(tw), shaftTop = top + setback
  const ph = tw.full ? Math.min(2.6, tw.h * .12) : 0
  const shaft = tw.base - ph - shaftTop, cap = capDepth(tw.w, shaft, scale)
  boxFaces(ctx, x0, shaftTop + cap, tw.w, shaft - cap, f, .28, Math.min(2.2, shaft * .30))
  topPlane(ctx, x0, shaftTop, tw.w, cap, f.top)
  if (ph) {
    const pw = tw.w + 2.2, depth = capDepth(pw, ph, scale)
    boxFaces(ctx, tw.x - pw / 2, tw.base - ph + depth, pw, ph - depth, f, .25, .6)
    topPlane(ctx, tw.x - pw / 2, tw.base - ph, pw, depth, f.top)
  }
  if (setback > 0) {
    const w = tw.w * .62, depth = capDepth(w, setback, scale)
    boxFaces(ctx, tw.x - w / 2, top + depth, w, setback - depth + .2, f, .28, 0)
    topPlane(ctx, tw.x - w / 2, top, w, depth, f.top)
  }
  let tipY = top
  if (tw.crown === 2) {
    tipY -= mastHeight(tw)
    ctx.fillStyle = css(f.front.wall)
    ctx.fillRect(tw.x - .2, tipY, .4, top - tipY)
  }
  const faceW = Math.max(.5, Math.min(1.6, tw.w * (tw.full ? .3 : .24))) * .85
  paintTowerWindows(ctx, tw, t, s, lamps, shaftTop, tipY, f.recess, faceW)
}
