import type { PlacedMark } from '../../../data/landmarks/types'
import { SCENE_H } from '../sunPath'
import { fieldWidth } from './generic/buildingSpecs'
import { curated, isField, isHillMark } from './hillPlane'
import { boxAround, fieldBox, fieldDepthOf, markGeometry, overlaps, type Box } from './markBox'

/** The sheet rises 14 px over the scene (Sheet.module.css `margin: -14px …`): below this line nothing shows. */
export const SHEET_OVERLAP = 14
export const VISIBLE_BOTTOM = SCENE_H - SHEET_OVERLAP
/** A base closer than this to the sheet edge reads as a stub cut by the card. */
export const SHEET_CLEAR = 6
const MAX_LIFT = 6
/** The village dot with its ring (ValleyScene.module.css `.village`). */
export const DOT_R = 4.5
const LABEL_H = 11
const MIN_FIELD_DEPTH = 1

type Ground = (x: number) => number
export interface Point { x: number; y: number }

/** 0, +step, −step, +2·step, … up to ±max: the nearest shifts first. */
export function shifts(max: number, step: number) {
  const out = [0]
  for (let d = step; d <= max; d += step) out.push(d, -d)
  return out
}

/** Width of a one-line label (Heebo-like digits and Hebrew run about half an em). */
export function textWidth(text: string, fontPx: number) { return text.length * fontPx * .5 + 1 }

function fitBuilding(mark: PlacedMark, x: number, ground: Ground, dot: Point) {
  let at = x
  let geometry = markGeometry(mark, at, ground)
  if (!geometry) return { mark, x }
  if (!mark.absorbed && overlaps(geometry.box, boxAround(dot.x, dot.y, DOT_R))) {
    at = dot.x + Math.sign(x - dot.x || 1) * ((geometry.box.right - geometry.box.left) / 2 + DOT_R + 1)
    geometry = markGeometry(mark, at, ground)
    if (!geometry) return null
  }
  const need = geometry.base - (VISIBLE_BOTTOM - SHEET_CLEAR)
  if (need <= 0) return { mark, x: at }
  return (curated(mark) || mark.landmark || mark.absorbed) && need <= MAX_LIFT ? { mark: { ...mark, lift: need }, x: at } : null
}

function fitField(mark: PlacedMark, x: number, ground: Ground, width: number, dot: Point) {
  const w = fieldWidth(mark.kind)
  const want = fieldDepthOf(mark)
  for (const at of shifts(48, 4).map((shift) => x + shift)) {
    if (at - w / 2 < 8 || at + w / 2 > width - 8) continue
    const depth = Math.min(want, VISIBLE_BOTTOM - 2 - fieldBox(mark.kind, at, w, 0, ground).bottom)
    if (depth < MIN_FIELD_DEPTH || overlaps(fieldBox(mark.kind, at, w, depth, ground), boxAround(dot.x, dot.y, DOT_R))) continue
    return { mark: depth === want ? mark : { ...mark, fieldDepth: depth }, x: at }
  }
  return null
}

/**
 * Near hill marks placed for what is visible: buildings step off the village dot and either clear the sheet edge,
 * are lifted a little (the place's own landmarks) or are dropped; fields slide onto the visible face under the crest.
 */
export function fitMarks(marks: PlacedMark[], ground: Ground, width: number, dot: Point): PlacedMark[] {
  return marks.flatMap((mark) => {
    if (!isHillMark(mark)) return [mark]
    const x = mark.xPct / 100 * width
    const fitted = isField(mark) ? fitField(mark, x, ground, width, dot) : fitBuilding(mark, x, ground, dot)
    return fitted ? [{ ...fitted.mark, xPct: fitted.x / width * 100 }] : []
  })
}

/** Boxes of everything drawn on the near hill (buildings and fields), for labels to keep clear of. */
export function hillBoxes(marks: PlacedMark[], ground: Ground, width: number): Box[] {
  return marks.filter(mark => isHillMark(mark) || mark.layer === 'plain').flatMap((mark) => {
    const x = mark.xPct / 100 * width
    if (mark.layer === 'near' && isField(mark)) return [fieldBox(mark.kind, x, fieldWidth(mark.kind), fieldDepthOf(mark), ground)]
    const geometry = markGeometry(mark, x, ground)
    return geometry ? [geometry.box] : []
  })
}

interface LabelInput {
  dot: Point
  text: string
  /** Where the label would sit: under the dot, the sea line or the houses above it. */
  top: number
  /** Below sea level the label stays under the sea line. */
  minTop: number
  obstacles: Box[]
  width: number
}

/** Air between the label and any mark (px): glyphs such as the Báb's garden terraces spill past their box. */
const LABEL_PAD = 2

/** The elevation label's centre x and top: the nearest spot to its own that overlaps no mark, house, or dot. */
export function placeLabel({ dot, text, top, minTop, obstacles, width }: LabelInput): Point {
  const w = textWidth(text, 11)
  const tops = [top, dot.y - DOT_R - 1 - LABEL_H].filter((y) => y >= minTop)
  const all = [...obstacles, boxAround(dot.x, dot.y, DOT_R)]
  for (const shift of shifts(60, 2)) {
    for (const y of tops) {
      const box = { left: dot.x + shift - w / 2, right: dot.x + shift + w / 2, top: y, bottom: y + LABEL_H }
      if (box.left < 4 || box.right > width - 4 || box.bottom > VISIBLE_BOTTOM - 1) continue
      if (all.every((other) => !overlaps(box, other, LABEL_PAD))) return { x: dot.x + shift, y }
    }
  }
  return { x: dot.x, y: Math.max(minTop, Math.min(top, VISIBLE_BOTTOM - 1 - LABEL_H)) }
}
