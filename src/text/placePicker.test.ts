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
  it('queues search ok and GPS error arriving in the same tick and delivers both in order', () => {
    expect(PICKER_LIVE_INITIAL.spoken).toBe('')
    expect(pickerVisible(PICKER_LIVE_INITIAL)).toBe('')

    let s = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: { text: LOCATING, hidden: true }, terminal: false })
    expect(s.spoken).toBe(LOCATING)
    expect(pickerVisible(s)).toBe('')

    s = pickerLiveReducer(s, { type: 'search', note: { text: SEARCHING, hidden: false }, terminal: false })
    expect(s.spoken).toBe(SEARCHING)
    expect(pickerVisible(s)).toBe(SEARCHING)

    const gpsErr = { text: geolocationErrorText(3), hidden: false }
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(3), terminal: true })
    s = pickerLiveReducer(s, { type: 'gps', note: gpsErr, terminal: true })
    expect(s.spoken).toBe('נמצאו \u20663\u2069 מקומות')
    expect(s.phase).toBe('holding')
    expect(pickerVisible(s)).toBe(gpsErr.text)

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe('')
    expect(s.phase).toBe('gap')

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe(gpsErr.text)
    expect(s.phase).toBe('holding')

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe('')
    expect(s.phase).toBe('idle')
  })

  it('delivers GPS error then search ok in order when arriving in the same tick', () => {
    const gpsErr = { text: geolocationErrorText(1), hidden: false }
    let s = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: gpsErr, terminal: true })
    s = pickerLiveReducer(s, { type: 'search', note: searchNote(2), terminal: true })
    expect(s.spoken).toBe(gpsErr.text)

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe('')
    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe('נמצאו \u20662\u2069 מקומות')
    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe('')
    expect(s.phase).toBe('idle')
  })

  it('dedupes repeated terminal outcomes, shields them from progress edits, and resets cleanly', () => {
    const searchErr = { text: searchErrorText(false), hidden: false }
    let s = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'search', note: searchErr, terminal: true })
    s = pickerLiveReducer(s, { type: 'search', note: searchErr, terminal: true })
    s = pickerLiveReducer(s, { type: 'search', note: { text: SEARCHING, hidden: false }, terminal: false })
    expect(s.spoken).toBe(searchErr.text)
    expect(s.queue).toEqual([])
    expect(pickerVisible(s)).toBe(SEARCHING)

    s = pickerLiveReducer(s, { type: 'advance' })
    expect(s.spoken).toBe('')
    expect(s.phase).toBe('idle')

    const gpsErr = { text: geolocationErrorText(2), hidden: false }
    const gpsFailed = pickerLiveReducer(PICKER_LIVE_INITIAL, { type: 'gps', note: gpsErr, terminal: true })
    expect(pickerVisible(pickerLiveReducer(gpsFailed, { type: 'search', note: EMPTY_NOTE, terminal: false }))).toBe(gpsErr.text)

    const cleared = pickerLiveReducer(gpsFailed, { type: 'reset' })
    expect(cleared).toBe(PICKER_LIVE_INITIAL)
  })
})
