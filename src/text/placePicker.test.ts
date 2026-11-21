import { describe, expect, it } from 'vitest'
import {
  EMPTY_NOTE,
  geolocationErrorText,
  LOCATING,
  NO_RESULTS,
  PICKER_LIVE_INITIAL,
  pickerLiveReducer,
  pickerVisible,
  SEARCHING,
  searchErrorText,
  searchNote,
  searchResultsText,
} from './placePicker'

const searching = { text: SEARCHING, hidden: false }
const locating = { text: LOCATING, hidden: true }

describe('geolocationErrorText', () => {
  it('maps each GeolocationPositionError code to a specific Hebrew message', () => {
    expect(geolocationErrorText(1)).toBe('אין הרשאה למיקום. אפשר לחפש יישוב בשדה החיפוש.')
    expect(geolocationErrorText(2)).toBe('לא הצלחנו לקבוע את המיקום כרגע. אפשר לחפש יישוב בשדה החיפוש.')
    expect(geolocationErrorText(3)).toBe('איתור המיקום לקח יותר מדי זמן. אפשר לנסות שוב או לחפש יישוב.')
    expect(geolocationErrorText(99)).toBe('לא הצלחנו לקבוע את המיקום כרגע. אפשר לחפש יישוב בשדה החיפוש.')
  })
})

describe('searchErrorText', () => {
  it('names the network when offline and stays generic when online', () => {
    expect(searchErrorText(false)).toBe('אין חיבור לאינטרנט, אי אפשר לחפש כרגע.')
    expect(searchErrorText(true)).toBe('לא הצלחנו לחפש כרגע')
  })
})

describe('searchResultsText', () => {
  it('uses Hebrew number agreement and isolates plural counts in LTR', () => {
    expect(searchResultsText(0)).toBe(NO_RESULTS)
    expect(searchResultsText(1)).toBe('נמצא מקום אחד')
    expect(searchResultsText(2)).toBe('נמצאו \u20662\u2069 מקומות')
    expect(searchResultsText(12)).toBe('נמצאו \u206612\u2069 מקומות')
  })
})

describe('pickerLiveReducer & pickerVisible', () => {
  it('delivers GPS and search outcomes in arrival order both ways and keeps GPS queued across search clears', () => {
    let s = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: locating, terminal: false, requestId: 1 })
    expect(s.spoken).toBe(LOCATING)
    expect(pickerVisible(s)).toBe('')

    s = pickerLiveReducer(s, { type: 'search', note: searching, terminal: false, requestId: 1 })
    expect(s.spoken).toBe(SEARCHING)
    expect(pickerVisible(s)).toBe(SEARCHING)

    const gpsErr = { text: geolocationErrorText(3), hidden: false }
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(3), terminal: true, requestId: 1 })
    s = pickerLiveReducer(s, { type: 'gps', note: gpsErr, terminal: true, requestId: 1 })
    // Clearing search must not drop the queued GPS error.
    s = pickerLiveReducer(s, { type: 'search', note: EMPTY_NOTE, terminal: false, requestId: 2 })
    expect(s.spoken).toBe('נמצאו \u20663\u2069 מקומות')
    expect(pickerVisible(s)).toBe(gpsErr.text)

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.phase).toBe('gap')
    expect(s.spoken).toBe('')
    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe(gpsErr.text)
    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe('')
    expect(s.phase).toBe('idle')

    const gpsFirst = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: gpsErr, terminal: true, requestId: 1 })
    let s2 = pickerLiveReducer(gpsFirst, { type: 'search', note: searchNote(2), terminal: true, requestId: 1 })
    expect(s2.spoken).toBe(gpsErr.text)
    s2 = pickerLiveReducer(pickerLiveReducer(s2, { type: 'advance' }), { type: 'advance' })
    expect(s2.spoken).toBe('נמצאו \u20662\u2069 מקומות')
    s2 = pickerLiveReducer(s2, { type: 'advance' })
    expect(s2.phase).toBe('idle')
  })

  it('announces a same-count refine from a newer request once after the gap, while deduping same requestId', () => {
    let s = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'search', note: searchNote(3), terminal: true, requestId: 1 })
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(3), terminal: true, requestId: 1 })
    expect(s.queue).toEqual([])

    s = pickerLiveReducer(s, { type: 'search', note: searching, terminal: false, requestId: 2 })
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(3), terminal: true, requestId: 2 })
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(3), terminal: true, requestId: 2 })
    expect(s.spoken).toBe('נמצאו \u20663\u2069 מקומות')
    expect(s.queue).toEqual([{ source: 'search', requestId: 2, text: 'נמצאו \u20663\u2069 מקומות' }])

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.phase).toBe('gap')
    expect(s.spoken).toBe('')
    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.phase).toBe('holding')
    expect(s.spoken).toBe('נמצאו \u20663\u2069 מקומות')
    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.phase).toBe('idle')
    expect(s.spoken).toBe('')
  })

  it('drops a queued search count when input is cleared during a GPS hold', () => {
    const gpsErr = { text: geolocationErrorText(1), hidden: false }
    let s = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: gpsErr, terminal: true, requestId: 1 })
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(4), terminal: true, requestId: 1 })
    s = pickerLiveReducer(s, { type: 'search', note: EMPTY_NOTE, terminal: false, requestId: 2 })
    expect(s.queue).toEqual([])
    expect(s.spoken).toBe(gpsErr.text)
    expect(pickerVisible(s)).toBe(gpsErr.text)

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.phase).toBe('idle')
    expect(s.spoken).toBe('')
  })

  it('drops older queued search on a new search, keeps pending progress across hold, and announces the new result', () => {
    const gpsErr = { text: geolocationErrorText(2), hidden: false }
    let s = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: gpsErr, terminal: true, requestId: 1 })
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(5), terminal: true, requestId: 1 })
    s = pickerLiveReducer(s, { type: 'search', note: searching, terminal: false, requestId: 2 })
    expect(s.queue).toEqual([])
    expect(s.spoken).toBe(gpsErr.text)
    expect(pickerVisible(s)).toBe(SEARCHING)

    // If the hold finishes before request 2 completes, pending "מחפש…" surfaces without being lost.
    const afterHold = pickerLiveReducer(s, { type: 'advance' })
    expect(afterHold.phase).toBe('progress')
    expect(afterHold.spoken).toBe(SEARCHING)
    const afterDone = pickerLiveReducer(afterHold, { type: 'search', note: searchNote(2), terminal: true, requestId: 2 })
    expect(afterDone.spoken).toBe('נמצאו \u20662\u2069 מקומות')
    expect(pickerLiveReducer(afterDone, { type: 'advance' }).phase).toBe('idle')

    // If request 2 completes during the hold, only request 2 plays after the gap (and stale request 1 is ignored).
    let s2 = pickerLiveReducer(s, { type: 'search', note: searchNote(2), terminal: true, requestId: 2 })
    s2 = pickerLiveReducer(s2, { type: 'search', note: searchNote(9), terminal: true, requestId: 1 })
    s2 = pickerLiveReducer(pickerLiveReducer(s2, { type: 'advance' }), { type: 'advance' })
    expect(s2.spoken).toBe('נמצאו \u20662\u2069 מקומות')
    expect(pickerLiveReducer(s2, { type: 'advance' }).phase).toBe('idle')
    expect(pickerLiveReducer(s2, { type: 'reset' })).toBe(PICKER_LIVE_INITIAL)
  })
})
