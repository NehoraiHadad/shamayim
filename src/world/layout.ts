import { SCENE_H } from './sceneBox'

/**
 * The scene's layout constants and box helpers (stage C4): the world places the marks and the height label with them
 * (`world/marks.ts`, `world/place.ts`).
 */

/** The sheet rises 14 px over the scene (Sheet.module.css `margin: -14px …`): below this line nothing shows. */
export const SHEET_OVERLAP = 14
export const VISIBLE_BOTTOM = SCENE_H - SHEET_OVERLAP
/** A base closer than this to the sheet edge reads as a stub cut by the card. */
export const SHEET_CLEAR = 6
/** The village dot with its ring (`scene/react/Scene.module.css` `.village`). */
export const DOT_R = 4.5
/** The height label's drawn size (`ui/tokens.css` `--text-caption` = 0.75rem = 12 px, `scene/react/Scene.module.css` `.depth` `line-height: 1`). */
export const LABEL_PX = 12
export const LABEL_H = LABEL_PX
/** CSS padding on the height badge. */
export const BACKING_PAD = 2.5

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

// Assistant 600 bundled by @fontsource/assistant (600.css), Hebrew and Latin WOFF
// cmap/hmtx advances in units of 1/1000 em. The scene uses this face for every note.
const ADVANCE: Readonly<Record<string, number>> = {
  '0': 506, '1': 463, ' ': 200, '\u00a0': 200, ',': 264, '-': 317, '−': 506, '־': 321, '(': 315, ')': 315,
  א: 586, ב: 534, ג: 395, ד: 539, ה: 558, ו: 240, ז: 367, ח: 578, ט: 570, י: 240,
  ך: 507, כ: 478, ל: 486, ם: 585, מ: 621, ן: 240, נ: 374, ס: 583, ע: 551,
  ף: 555, פ: 548, ץ: 496, צ: 536, ק: 567, ר: 480, ש: 652, ת: 618, '׳': 239, '״': 418,
}

export function textWidth(text: string, fontPx: number) {
  let units = 0
  for (const char of text) {
    if (/[\u2066-\u2069\p{Mark}]/u.test(char)) continue
    // Use the widest listed advance for digits, Hebrew letters and punctuation.
    units += ADVANCE[char] ?? (/[0-9]/.test(char) ? 506 : /\p{Script=Hebrew}/u.test(char) ? 652 : /\p{Punctuation}/u.test(char) ? 418 : 1000)
  }
  return Math.ceil(units * fontPx / 1000)
}
