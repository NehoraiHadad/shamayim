import { ltr } from './isolate'

export const NO_GEOLOCATION = 'שירותי המיקום אינם זמינים במכשיר הזה'
export const REVERSE_FAILED = 'לא הצלחנו לזהות את המיקום'
export const LOCATING = 'מאתר מיקום…'
export const SEARCHING = 'מחפש…'
export const NO_RESULTS = 'לא נמצאו מקומות'

/** Geolocation error copy keyed by `GeolocationPositionError.code`. */
export function geolocationErrorText(code: number): string {
  if (code === 1) return 'אין הרשאה למיקום. אפשר לחפש יישוב בשדה החיפוש.'
  if (code === 3) return 'איתור המיקום לקח יותר מדי זמן. אפשר לנסות שוב או לחפש יישוב.'
  return 'לא הצלחנו לקבוע את המיקום כרגע. אפשר לחפש יישוב בשדה החיפוש.'
}

/** Search failure copy, distinguishing offline from a server/request failure. */
export function searchErrorText(online: boolean): string {
  return online ? 'לא הצלחנו לחפש כרגע' : 'אין חיבור לאינטרנט, אי אפשר לחפש כרגע.'
}

/** Screen-reader and empty-state count announcement with Hebrew number agreement. */
export function searchResultsText(count: number): string {
  if (count <= 0) return NO_RESULTS
  if (count === 1) return 'נמצא מקום אחד'
  return `נמצאו ${ltr(String(count))} מקומות`
}

export interface PickerNote {
  text: string
  /** True when the note is for screen readers only (button/list already convey it visually). */
  hidden: boolean
}

/** Live-region note for the place picker: visible for errors/searching, SR-only for locating/result count. */
export function pickerStatus({ locating, pending, error, resultCount }: {
  locating: boolean
  pending: boolean
  error: string
  resultCount: number
}): PickerNote {
  if (locating) return { text: LOCATING, hidden: true }
  if (pending) return { text: SEARCHING, hidden: false }
  if (error) return { text: error, hidden: false }
  if (resultCount > 0) return { text: searchResultsText(resultCount), hidden: true }
  return { text: '', hidden: false }
}
