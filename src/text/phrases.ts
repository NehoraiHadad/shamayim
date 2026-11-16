import { THRESHOLDS as T } from '../config/thresholds'
import type { ConditionKind } from '../domain/conditions'

/** Whole Hebrew phrases. Words are chosen to agree with "היום/הלילה/מחר" (masc. sing.). */

export function dayTempWord(max: number): string {
  const d = T.dayTemp
  if (max < d.cool) return 'קריר'
  if (max < d.pleasant) return 'נעים'
  if (max < d.warm) return 'חמים'
  if (max < d.hot) return 'חם'
  if (max < d.veryHot) return 'חם מאוד'
  return 'שרב'
}

export function nightTempWord(low: number): string {
  const n = T.nightTemp
  if (low < n.cold) return 'קר'
  if (low < n.cool) return 'קריר'
  if (low >= n.warmNight) return 'חם'
  return 'נעים'
}

/** Sky prefix joined to a temperature word: "בהיר ונעים", "מעונן חלקית וחם". */
export function skyWith(kind: ConditionKind, tempWord: string): string {
  const sky: Partial<Record<ConditionKind, string>> = {
    clear: 'בהיר',
    partly: 'מעונן חלקית',
    cloudy: 'מעונן',
    fog: 'ערפילי',
  }
  const s = sky[kind]
  return s ? `${s} ו${tempWord}` : tempWord
}

export type DayPart = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'

export function dayPartOf(hour: number): DayPart {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 15) return 'noon'
  if (hour >= 15 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

/** "During" form: "אחר הצהריים רוח ערה". */
export const DURING: Record<DayPart, string> = {
  morning: 'בבוקר',
  noon: 'בצהריים',
  afternoon: 'אחר הצהריים',
  evening: 'בערב',
  night: 'בלילה',
}

/** "Starting from" form: "צפוי גשם מהצהריים". */
export const FROM: Record<DayPart, string> = {
  morning: 'מהבוקר',
  noon: 'מהצהריים',
  afternoon: 'אחר הצהריים',
  evening: 'בערב',
  night: 'בלילה',
}

export const deg = (n: number) => `${Math.round(n)}°`
export const mm = (n: number) => `${Math.max(1, Math.round(n))} מ״מ`

/** Join clauses: "א, ב ו־ג" style, with the conjunction ו attached to the last. */
export function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  const last = parts[parts.length - 1]
  return `${parts.slice(0, -1).join(', ')}, ו${last}`
}
