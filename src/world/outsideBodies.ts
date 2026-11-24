import { HOUSE_TOP_M } from '../data/city/outsideView'
import { STOREY_M } from '../data/city/skylineHeight'
import { outsideItemKm } from './outsideDepth'
import { hits, type ScreenBox } from './sceneClearance'
import type { OutsideView } from './types'

/** Trim in fifths, keeping at least three fifths so a body still reads as a building. */
const TRIMMED_WIDTHS = [.8, .6]

/** The body clear of the zones: whole, or (`trim`) its wider clear portion, anchored at one of its own edges; else none. */
function clearBody(zones: readonly ScreenBox[], x: number, w: number, top: number, foot: number, trim: boolean) {
  const left = x - w / 2, right = x + w / 2
  if (!hits(zones, left, top, right, foot)) return { x, w }
  if (!trim) return null
  for (const share of TRIMMED_WIDTHS) {
    const kept = w * share
    if (!hits(zones, left, top, left + kept, foot)) return { x: left + kept / 2, w: kept }
    if (!hits(zones, right - kept, top, right, foot)) return { x: right - kept / 2, w: kept }
  }
  return null
}

export const roofM = (box: { heightM?: number }) => box.heightM ?? 3 * STOREY_M

/**
 * What of the outside view stands clear of the text and the dot, as drawn: each body's middle and width (land px, x scaled
 * from the reference width by `sx`). The one silhouette the scene draws and the sun and moon are judged against.
 */
export function outsideBodies(view: OutsideView, clear: readonly ScreenBox[], sx: number) {
  const { skyline, frame, baseKm } = view
  const free = (x: number, half: number, top: number, foot: number) => !hits(clear, x - half, top, x + half, foot)
  const stacks = skyline.towers.filter(t => t.industrial && free(t.x * sx, t.w / 2, t.baseY - t.h, t.baseY))
    .map(t => ({ x: t.x * sx - t.w / 2, y: t.baseY - t.h, w: t.w, h: t.h, base: t.baseY, km: outsideItemKm(frame, baseKm, t) }))
  const boxes = skyline.boxes.flatMap(box => {
    const km = outsideItemKm(frame, baseKm, box), block = roofM(box) >= HOUSE_TOP_M
    // A wide block keeps its clear side, and leaves a mapped stack behind it readable; a house is whole or not there.
    const zones = block && stacks.length ? [...clear, ...stacks.filter(stack => stack.km > km && stack.base <= box.foot)] : clear
    const body = clearBody(zones, box.x * sx, box.w * sx, box.top, box.foot, block)
    return body ? [{ box, km, ...body }] : []
  })
  const towers = skyline.towers.flatMap(tower => {
    const body = clearBody(clear, tower.x * sx, tower.w, tower.baseY - tower.h, tower.baseY, !tower.industrial)
    return body ? [{ tower, km: outsideItemKm(frame, baseKm, tower), ...body }] : []
  })
  const beyond = view.beyond.filter(t => free(t.x * sx, t.w / 2, t.baseY - t.h, t.baseY))
  const towns = (view.beyondTowns ?? []).filter(b => free(b.x * sx, b.w * sx / 2, b.baseY - b.h, b.baseY))
  const trees = view.trees.filter(t => free(t.x * sx, t.w, t.base - t.h, t.base))
  return { boxes, towers, beyond, towns, trees }
}
