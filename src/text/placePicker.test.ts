import { describe, expect, it } from 'vitest'
import {
  EMPTY_NOTE, geolocationErrorText, LOCATING, NO_RESULTS, PICKER_LIVE_INITIAL,
  pickerLiveReducer, pickerVisible, SEARCHING, searchErrorText, searchNote, searchResultsText,
  type LiveSource, type PickerLiveAction, type PickerLiveState, type PickerNote,
} from './placePicker'

const noteAction = (type: LiveSource, note: PickerNote, requestId = 1, terminal = false) =>
  ({ type, note, requestId, terminal })
const locating = noteAction('gps', { text: LOCATING, hidden: true })
const searching = (requestId = 1) => noteAction('search', { text: SEARCHING, hidden: false }, requestId)
const clear = noteAction('search', EMPTY_NOTE, 2)
const result = (count: number, requestId = 1) => noteAction('search', searchNote(count), requestId, true)
const gpsError = (code: number, requestId = 1) =>
  noteAction('gps', { text: geolocationErrorText(code), hidden: false }, requestId, true)
const advance: PickerLiveAction = { type: 'advance' }
const reduce = (state: PickerLiveState, ...actions: PickerLiveAction[]) => actions.reduce(pickerLiveReducer, state)
const start = (...actions: PickerLiveAction[]) => reduce(PICKER_LIVE_INITIAL, ...actions)

describe('geolocationErrorText', () => {
  it.each([
    [1, 'אין הרשאה למיקום. אפשר לחפש יישוב בשדה החיפוש.'],
    [2, 'לא הצלחנו לקבוע את המיקום כרגע. אפשר לחפש יישוב בשדה החיפוש.'],
    [3, 'איתור המיקום לקח יותר מדי זמן. אפשר לנסות שוב או לחפש יישוב.'],
    [99, 'לא הצלחנו לקבוע את המיקום כרגע. אפשר לחפש יישוב בשדה החיפוש.'],
  ])('maps geolocation error %i to its Hebrew message', (code, message) => {
    expect(geolocationErrorText(code)).toBe(message)
  })
})

describe('searchErrorText', () => {
  it('names the network when offline and stays generic when online', () => {
    expect(searchErrorText(false)).toBe('אין חיבור לאינטרנט, אי אפשר לחפש כרגע.')
    expect(searchErrorText(true)).toBe('לא הצלחנו לחפש כרגע')
  })
})

describe('searchResultsText', () => {
  it.each([
    [0, NO_RESULTS], [1, 'נמצא מקום אחד'],
    [2, 'נמצאו \u20662\u2069 מקומות'], [12, 'נמצאו \u206612\u2069 מקומות'],
  ])('uses Hebrew agreement and LTR isolation for count %i', (count, message) => {
    expect(searchResultsText(count)).toBe(message)
  })
})

describe('pickerLiveReducer & pickerVisible', () => {
  it('delivers search then GPS outcomes in arrival order across a search clear', () => {
    let state = start(locating)
    expect(state.spoken).toBe(LOCATING)
    expect(pickerVisible(state)).toBe('')
    state = reduce(state, searching())
    expect(state.spoken).toBe(SEARCHING)
    expect(pickerVisible(state)).toBe(SEARCHING)

    const error = gpsError(3)
    state = reduce(state, result(3), error, clear)
    expect(state.spoken).toBe('נמצאו \u20663\u2069 מקומות')
    expect(pickerVisible(state)).toBe(error.note.text)
    state = reduce(state, advance)
    expect(state).toMatchObject({ phase: 'gap', spoken: '' })
    state = reduce(state, advance)
    expect(state.spoken).toBe(error.note.text)
    expect(reduce(state, advance)).toMatchObject({ phase: 'idle', spoken: '' })
  })

  it('delivers GPS then search outcomes in arrival order', () => {
    const error = gpsError(3)
    const state = start(error, result(2))
    expect(state.spoken).toBe(error.note.text)
    const next = reduce(state, advance, advance)
    expect(next.spoken).toBe('נמצאו \u20662\u2069 מקומות')
    expect(reduce(next, advance).phase).toBe('idle')
  })

  it('announces a same-count refine once after the gap and dedupes the same request', () => {
    const first = start(result(3), result(3))
    expect(first.queue).toEqual([])
    const next = reduce(first, searching(2), result(3, 2), result(3, 2))
    expect(next.spoken).toBe('נמצאו \u20663\u2069 מקומות')
    expect(next.queue).toEqual([{ source: 'search', requestId: 2, text: 'נמצאו \u20663\u2069 מקומות' }])
    const gap = reduce(next, advance)
    expect(gap).toMatchObject({ phase: 'gap', spoken: '' })
    const holding = reduce(gap, advance)
    expect(holding).toMatchObject({ phase: 'holding', spoken: 'נמצאו \u20663\u2069 מקומות' })
    expect(reduce(holding, advance)).toMatchObject({ phase: 'idle', spoken: '' })
  })

  it('drops a queued search count when input is cleared during a GPS hold', () => {
    const error = gpsError(1)
    const state = start(error, result(4), clear)
    expect(state.queue).toEqual([])
    expect(state.spoken).toBe(error.note.text)
    expect(pickerVisible(state)).toBe(error.note.text)
    expect(reduce(state, advance)).toMatchObject({ phase: 'idle', spoken: '' })
  })

  it('replaces an older queued search and keeps the newer progress through the hold', () => {
    const error = gpsError(2)
    const state = start(error, result(5), searching(2))
    expect(state.queue).toEqual([])
    expect(state.spoken).toBe(error.note.text)
    expect(pickerVisible(state)).toBe(SEARCHING)

    const afterHold = reduce(state, advance)
    expect(afterHold).toMatchObject({ phase: 'progress', spoken: SEARCHING })
    const afterDone = reduce(afterHold, result(2, 2))
    expect(afterDone.spoken).toBe('נמצאו \u20662\u2069 מקומות')
    expect(reduce(afterDone, advance).phase).toBe('idle')

    // If the newer search completes during the hold, only its result plays after the gap.
    const duringHold = reduce(state, result(2, 2), result(9), advance, advance)
    expect(duringHold.spoken).toBe('נמצאו \u20662\u2069 מקומות')
    expect(reduce(duringHold, advance).phase).toBe('idle')
    expect(reduce(duringHold, { type: 'reset' })).toBe(PICKER_LIVE_INITIAL)
  })

  it('clears the live region when a search result hold ends with GPS still pending', () => {
    const pending = start(locating)
    expect(pending.spoken).toBe(LOCATING)
    const state = reduce(pending, searching(), result(3), advance)
    expect(state).toMatchObject({ phase: 'idle', spoken: '' })
    expect(pickerVisible(state)).toBe('')
  })

  it('does not repeat pending GPS progress when the search is cleared', () => {
    expect(start(locating, searching(), clear)).toMatchObject({ phase: 'idle', spoken: '' })
  })

  it('restores already-spoken search progress visibly after the GPS error hold', () => {
    const error = gpsError(3)
    const holding = start(searching(), error)
    expect(pickerVisible(holding)).toBe(error.note.text)
    const state = reduce(holding, advance)
    expect(state).toMatchObject({ phase: 'idle', spoken: '' })
    expect(pickerVisible(state)).toBe(SEARCHING)
  })

  it('announces search progress started during a hold once, even across another hold', () => {
    const afterHold = start(gpsError(3), searching(), advance)
    expect(afterHold).toMatchObject({ phase: 'progress', spoken: SEARCHING })
    const state = reduce(afterHold, gpsError(3, 2), advance)
    expect(state).toMatchObject({ phase: 'idle', spoken: '' })
    expect(pickerVisible(state)).toBe(SEARCHING)
    const nextRequest = reduce(state, gpsError(3, 3), searching(2), advance)
    expect(nextRequest).toMatchObject({ phase: 'progress', spoken: SEARCHING })
  })
})
