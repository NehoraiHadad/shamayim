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

/** `hidden: true` means SR-only (button/list already convey it visually). */
export interface PickerNote { text: string; hidden: boolean }

export const EMPTY_NOTE: PickerNote = { text: '', hidden: false }

/** Note for a completed search: empty state is visible; positive counts are SR-only. */
export function searchNote(count: number): PickerNote {
  return { text: searchResultsText(count), hidden: count > 0 }
}

export type LiveSource = 'search' | 'gps'
export type LivePhase = 'idle' | 'progress' | 'holding' | 'gap'
export interface LiveEntry { source: LiveSource; requestId: number; text: string }

/** Per-source visible note, pending progress (kept across holds), and request watermarks. */
export interface PickerSlot {
  text: string
  seq: number
  progress: string
  progressSeq: number
  spokenProgressId: number
  requestId: number
  doneId: number
}

export interface PickerLiveState {
  search: PickerSlot
  gps: PickerSlot
  seq: number
  /** Current text for the `role="status"` live region; clears between queued outcomes. */
  spoken: string
  /** Queued terminal announcements in FIFO order, keyed by `(source, requestId)`. */
  queue: readonly LiveEntry[]
  phase: LivePhase
}

const EMPTY_SLOT: PickerSlot = { text: '', seq: 0, progress: '', progressSeq: 0, spokenProgressId: -1, requestId: 0, doneId: -1 }
export const PICKER_LIVE_INITIAL: PickerLiveState = {
  search: EMPTY_SLOT, gps: EMPTY_SLOT, seq: 0, spoken: '', queue: [], phase: 'idle',
}

export type PickerLiveAction =
  | { type: LiveSource; note: PickerNote; requestId: number; terminal?: boolean }
  | { type: 'advance' }
  | { type: 'reset' }

const newest = (a: string, aSeq: number, b: string, bSeq: number) => (!a ? b : !b ? a : aSeq >= bSeq ? a : b)

function progressSource({ search, gps }: Pick<PickerLiveState, 'search' | 'gps'>): LiveSource {
  return !gps.progress || (search.progress && search.progressSeq >= gps.progressSeq) ? 'search' : 'gps'
}

function idleOrProgress(state: PickerLiveState, previous = state): PickerLiveState {
  const source = progressSource(state)
  const slot = state[source]
  if (slot.progress && slot.spokenProgressId !== slot.requestId) {
    return { ...state, [source]: { ...slot, spokenProgressId: slot.requestId }, spoken: slot.progress, phase: 'progress' }
  }
  // Leave an uninterrupted announcement in place. Returning to it later should clear the live region.
  if (slot.progress && previous.phase === 'progress' && progressSource(previous) === source &&
    previous[source].requestId === slot.requestId) return state
  return state.phase === 'idle' ? state : { ...state, spoken: '', phase: 'idle' }
}

/** Queue terminal announcements keyed by `(source, requestId)` so current outcomes play once and superseded ones are dropped. */
export function pickerLiveReducer(state: PickerLiveState, action: PickerLiveAction): PickerLiveState {
  if (action.type === 'reset') return state === PICKER_LIVE_INITIAL ? state : PICKER_LIVE_INITIAL
  if (action.type === 'advance') {
    if (state.phase === 'holding') return state.queue.length ? { ...state, spoken: '', phase: 'gap' } : idleOrProgress(state)
    if (state.phase === 'gap') {
      const [next, ...rest] = state.queue
      return next ? { ...state, spoken: next.text, queue: rest, phase: 'holding' } : idleOrProgress(state)
    }
    return state
  }

  const source = action.type
  const current = state[source]
  const { requestId, terminal, note: { text, hidden } } = action
  if (requestId < current.requestId || requestId <= current.doneId) return state

  const visible = hidden ? '' : text
  const progress = terminal ? '' : text
  const visChanged = visible !== current.text || (visible !== '' && current.seq !== state.seq)
  const progChanged = progress !== current.progress || (progress !== '' && requestId !== current.requestId)
  const seq = visChanged || progChanged ? state.seq + 1 : state.seq
  const doneId = terminal ? requestId : current.doneId
  const slotChanged = visChanged || progChanged || requestId !== current.requestId || doneId !== current.doneId
  const nextSlot: PickerSlot = slotChanged
    ? { ...current, text: visible, seq: visChanged ? seq : current.seq, progress, progressSeq: progChanged ? seq : current.progressSeq, requestId, doneId }
    : current

  const { phase } = state
  let { queue } = state
  if (requestId > current.requestId && queue.some((e) => e.source === source && e.requestId < requestId)) {
    queue = queue.filter((e) => e.source !== source || e.requestId >= requestId)
  }

  const next = slotChanged || queue !== state.queue ? { ...state, [source]: nextSlot, seq, queue } : state
  if (terminal && text) {
    return phase === 'idle' || phase === 'progress'
      ? { ...next, spoken: text, phase: 'holding' }
      : { ...next, queue: [...queue, { source, requestId, text }] }
  }
  if (phase === 'idle' || phase === 'progress') return idleOrProgress(next, state)
  if (phase === 'gap' && queue.length === 0 && !next.search.progress && !next.gps.progress) return idleOrProgress(next)
  return next
}

/** Restore visible pending progress outside holds, even when the live region is empty. */
export function pickerVisible(state: Pick<PickerLiveState, 'search' | 'gps' | 'phase'>): string {
  const { search, gps, phase } = state
  const pending = state[progressSource(state)]
  if ((phase === 'idle' || phase === 'progress') && pending.progress && pending.text) return pending.text
  return newest(search.text, search.seq, gps.text, gps.seq)
}
