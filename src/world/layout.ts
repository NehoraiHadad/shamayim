import { SCENE_H } from './sunPath'

/**
 * The scene's layout constants and the height label's placement, for the canvas scene (stage C4). The same rules as the
 * SVG scene's `ui/scene/marks/sceneLayout.ts` (frozen until stage C9 deletes it), without its glyph boxes: the world
 * places the label against its own marks and composes the portrait round it (`world/marks.ts`, `world/portrait.ts`).
 */

/** The sheet rises 14 px over the scene (Sheet.module.css `margin: -14px …`): below this line nothing shows. */
export const SHEET_OVERLAP = 14
export const VISIBLE_BOTTOM = SCENE_H - SHEET_OVERLAP
/** A base closer than this to the sheet edge reads as a stub cut by the card. */
export const SHEET_CLEAR = 6
/** The village dot with its ring (ValleyScene.module.css `.village`). */
export const DOT_R = 4.5
export const LABEL_H = 11
/** Air between the label and any mark (px). */
const LABEL_PAD = 2

/** A drawn box in scene px (y grows down). */
export interface Box { left: number; right: number; top: number; bottom: number }
export interface Point { x: number; y: number }

export function overlaps(a: Box, b: Box, pad = 0) {
  return a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad
}

export function boxAround(x: number, y: number, half: number): Box {
  return { left: x - half, right: x + half, top: y - half, bottom: y + half }
}

/** 0, +step, −step, +2·step, … up to ±max: the nearest shifts first. */
export function shifts(max: number, step: number) {
  const out = [0]
  for (let d = step; d <= max; d += step) out.push(d, -d)
  return out
}

/** Width of a one-line label (Heebo-like digits and Hebrew run about half an em). */
export function textWidth(text: string, fontPx: number) { return text.length * fontPx * .5 + 1 }

export interface LabelInput {
  dot: Point
  text: string
  /** Where the label would sit: under the dot, or under the sea line below sea level. */
  top: number
  minTop: number
  obstacles: Box[]
  width: number
}

/** The elevation label's centre x and top: the nearest spot to its own that overlaps no mark and not the dot. */
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

/** The label's box (scene px) from its centre and top. */
export function labelBox(label: { text: string; x: number; y: number }): Box {
  const w = textWidth(label.text, 11)
  return { left: label.x - w / 2, right: label.x + w / 2, top: label.y, bottom: label.y + LABEL_H }
}
