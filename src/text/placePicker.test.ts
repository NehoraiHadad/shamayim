import { describe, expect, it } from 'vitest'
import {
  geolocationErrorText,
  LOCATING,
  NO_RESULTS,
  pickerStatus,
  SEARCHING,
  searchErrorText,
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

describe('pickerStatus', () => {
  it('announces locating and result counts visually hidden, while keeping errors and searching visible', () => {
    expect(pickerStatus({ locating: true, pending: false, error: '', resultCount: 0 }))
      .toEqual({ text: LOCATING, hidden: true })
    expect(pickerStatus({ locating: false, pending: true, error: '', resultCount: 0 }))
      .toEqual({ text: SEARCHING, hidden: false })
    expect(pickerStatus({ locating: false, pending: false, error: NO_RESULTS, resultCount: 0 }))
      .toEqual({ text: NO_RESULTS, hidden: false })
    expect(pickerStatus({ locating: false, pending: false, error: '', resultCount: 3 }))
      .toEqual({ text: 'נמצאו \u20663\u2069 מקומות', hidden: true })
    expect(pickerStatus({ locating: false, pending: false, error: '', resultCount: 0 }))
      .toEqual({ text: '', hidden: false })
  })
})
