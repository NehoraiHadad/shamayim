import { SCENE_H } from './sunPath'

/**
 * The scene's layout constants and box helpers (stage C4): the world places the marks and the height label with them
 * (`world/marks.ts`, `world/place.ts`).
 */

/** The sheet rises 14 px over the scene (Sheet.module.css `margin: -14px …`): below this line nothing shows. */
export const SHEET_OVERLAP = 14
export const VISIBLE_BOTTOM = SCENE_H - SHEET_OVERLAP
/** A base closer than this to the sheet edge reads as a stub cut by the card. */
export const SHEET_CLEAR = 6
/** The room kept clear round the place's dot (`scene/react/HeightLabel.tsx`). */
export const DOT_R = 4.5
/** The size the place's height is lettered in, at the least (`scene/react/heightHands.ts`), and how tall its figures stand. */
export const LABEL_PX = 12
export const LETTER_H = 9

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
export function textWidth(text: string, fontPx: number) { return text.replace(/[\u2066-\u2069]/g, '').length * fontPx * .5 + 1 }

/** Room for the height in either hand's letters. */
export const letterWidth = (text: string) => Math.ceil(textWidth(text, LABEL_PX) * 1.1) + 2
