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

export const EMPTY_NOTE: PickerNote = { text: '', hidden: false }

/** Note for a completed search: empty state is visible; positive counts are SR-only. */
export function searchNote(count: number): PickerNote {
  return { text: searchResultsText(count), hidden: count > 0 }
}

export interface PickerOutcome {
  note: PickerNote
  /** Monotonic sequence of the last update to this source (0 = none yet). */
  seq: number
}

export interface PickerLiveState {
  search: PickerOutcome
  gps: PickerOutcome
  seq: number
}

export const PICKER_LIVE_INITIAL: PickerLiveState = {
  search: { note: EMPTY_NOTE, seq: 0 },
  gps: { note: EMPTY_NOTE, seq: 0 },
  seq: 0,
}

export type PickerLiveAction =
  | { type: 'search'; note: PickerNote }
  | { type: 'gps'; note: PickerNote }
  | { type: 'reset' }

/** Track search and GPS status independently so neither suppresses the other and the newest event wins. */
export function pickerLiveReducer(state: PickerLiveState, action: PickerLiveAction): PickerLiveState {
  if (action.type === 'reset') return state.seq === 0 ? state : PICKER_LIVE_INITIAL
  const current = state[action.type]
  if (action.note.text === '' && current.note.text === '') return state
  if (current.note.text === action.note.text && current.note.hidden === action.note.hidden && current.seq === state.seq) {
    return state
  }
  const seq = state.seq + 1
  return { ...state, [action.type]: { note: action.note, seq }, seq }
}

/** Active live-region note for the place picker: one message at a time, newest event wins. */
export function pickerStatus({ search, gps }: Pick<PickerLiveState, 'search' | 'gps'>): PickerNote {
  if (search.seq === 0 && gps.seq === 0) return EMPTY_NOTE
  return search.seq >= gps.seq ? search.note : gps.note
}
