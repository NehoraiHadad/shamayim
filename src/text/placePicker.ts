import { ltr } from './isolate'

export const NO_GEOLOCATION = 'שירותי המיקום אינם זמינים במכשיר הזה'
export const REVERSE_FAILED = 'לא הצלחנו לזהות את המיקום'
export const LOCATING = 'מאתר מיקום…'
export const SEARCHING = 'מחפש…'
export const NO_RESULTS = 'לא נמצאו מקומות'

/** How long a terminal live-region announcement stays before clearing. */
export const LIVE_HOLD_MS = 1_500
/** Short empty gap between queued terminal announcements so assistive tech reads each cleanly. */
export const LIVE_GAP_MS = 50

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

export type LivePhase = 'idle' | 'progress' | 'holding' | 'gap'

export interface PickerSlot {
  text: string
  /** Monotonic sequence of the last visible update to this source (0 = none yet). */
  seq: number
}

export interface PickerLiveState {
  search: PickerSlot
  gps: PickerSlot
  seq: number
  /** Current text for the `role="status"` live region; starts empty and clears between queued outcomes. */
  spoken: string
  /** Queued terminal announcements waiting their turn in FIFO order. */
  queue: readonly string[]
  phase: LivePhase
}

export const PICKER_LIVE_INITIAL: PickerLiveState = {
  search: { text: '', seq: 0 },
  gps: { text: '', seq: 0 },
  seq: 0,
  spoken: '',
  queue: [],
  phase: 'idle',
}

export type PickerLiveAction =
  | { type: 'search'; note: PickerNote; terminal?: boolean }
  | { type: 'gps'; note: PickerNote; terminal?: boolean }
  | { type: 'advance' }
  | { type: 'reset' }

/** Queue terminal announcements (search count/empty/error, GPS error) so concurrent outcomes are spoken in order without drops or repeats. */
export function pickerLiveReducer(state: PickerLiveState, action: PickerLiveAction): PickerLiveState {
  if (action.type === 'reset') {
    return state.seq === 0 && state.phase === 'idle' && !state.spoken && !state.queue.length
      ? state
      : PICKER_LIVE_INITIAL
  }
  if (action.type === 'advance') {
    if (state.phase === 'holding') {
      return state.queue.length > 0
        ? { ...state, spoken: '', phase: 'gap' }
        : { ...state, spoken: '', phase: 'idle' }
    }
    if (state.phase === 'gap') {
      const [next, ...rest] = state.queue
      return next
        ? { ...state, spoken: next, queue: rest, phase: 'holding' }
        : { ...state, spoken: '', queue: [], phase: 'idle' }
    }
    return state
  }

  const visible = action.note.hidden ? '' : action.note.text
  const current = state[action.type]
  const visibleChanged = visible !== current.text || (visible !== '' && current.seq !== state.seq)
  const seq = visibleChanged ? state.seq + 1 : state.seq
  const nextSlot = visibleChanged ? { text: visible, seq } : current

  let { spoken, queue, phase } = state
  const text = action.note.text
  if (action.terminal) {
    if (text) {
      if (phase === 'idle' || phase === 'progress') {
        spoken = text
        phase = 'holding'
      } else if (!(phase === 'holding' && spoken === text) && !queue.includes(text)) {
        queue = [...queue, text]
      }
    }
  } else if (phase === 'idle' || phase === 'progress') {
    spoken = text
    phase = text ? 'progress' : 'idle'
  }

  if (!visibleChanged && spoken === state.spoken && queue === state.queue && phase === state.phase) return state
  return { ...state, [action.type]: nextSlot, seq, spoken, queue, phase }
}

/** Visible status note for sighted users: newest non-empty visible text across search and GPS. */
export function pickerVisible({ search, gps }: Pick<PickerLiveState, 'search' | 'gps'>): string {
  if (!search.text) return gps.text
  if (!gps.text) return search.text
  return search.seq >= gps.seq ? search.text : gps.text
}
