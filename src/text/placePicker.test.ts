import { describe, expect, it } from 'vitest'
import {
  EMPTY_NOTE,
  geolocationErrorText,
  LOCATING,
  NO_RESULTS,
  PICKER_LIVE_INITIAL,
  pickerLiveReducer,
  pickerStatus,
  SEARCHING,
  searchErrorText,
  searchNote,
  searchResultsText,
} from './placePicker'

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

describe('pickerLiveReducer & pickerStatus', () => {
  it('starts empty and announces search ok while GPS is still pending, then GPS error ("search ok → GPS error")', () => {
    expect(pickerStatus(PICKER_LIVE_INITIAL)).toEqual(EMPTY_NOTE)

    const locating = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: { text: LOCATING, hidden: true } })
    expect(pickerStatus(locating)).toEqual({ text: LOCATING, hidden: true })

    const searching = pickerLiveReducer(locating, { type: 'search', note: { text: SEARCHING, hidden: false } })
    expect(pickerStatus(searching)).toEqual({ text: SEARCHING, hidden: false })

    const found = pickerLiveReducer(searching, { type: 'search', note: searchNote(3) })
    expect(pickerStatus(found)).toEqual({ text: 'נמצאו \u20663\u2069 מקומות', hidden: true })

    const gpsErr = { text: geolocationErrorText(3), hidden: false }
    const failed = pickerLiveReducer(found, { type: 'gps', note: gpsErr })
    expect(pickerStatus(failed)).toEqual(gpsErr)
  })

  it('announces GPS error first and then search ok without losing the count ("GPS error → search ok")', () => {
    const locating = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: { text: LOCATING, hidden: true } })
    const searching = pickerLiveReducer(locating, { type: 'search', note: { text: SEARCHING, hidden: false } })

    const gpsErr = { text: geolocationErrorText(1), hidden: false }
    const failed = pickerLiveReducer(searching, { type: 'gps', note: gpsErr })
    expect(pickerStatus(failed)).toEqual(gpsErr)

    const found = pickerLiveReducer(failed, { type: 'search', note: searchNote(2) })
    expect(pickerStatus(found)).toEqual({ text: 'נמצאו \u20662\u2069 מקומות', hidden: true })
  })

  it('surfaces search errors while GPS is pending, preserves GPS errors on empty search edits, and resets cleanly', () => {
    const locating = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: { text: LOCATING, hidden: true } })
    const searchErr = { text: searchErrorText(false), hidden: false }
    const errored = pickerLiveReducer(locating, { type: 'search', note: searchErr })
    expect(pickerStatus(errored)).toEqual(searchErr)

    const gpsErr = { text: geolocationErrorText(2), hidden: false }
    const gpsFailed = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: gpsErr })
    expect(pickerStatus(pickerLiveReducer(gpsFailed, { type: 'search', note: EMPTY_NOTE }))).toEqual(gpsErr)

    const empty = pickerLiveReducer(errored, { type: 'search', note: EMPTY_NOTE })
    expect(pickerStatus(empty)).toEqual(EMPTY_NOTE)

    expect(pickerStatus(pickerLiveReducer(gpsFailed, { type: 'reset' }))).toEqual(EMPTY_NOTE)
  })
})
