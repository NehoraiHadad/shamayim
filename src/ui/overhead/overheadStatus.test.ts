import { describe, expect, it } from 'vitest'
import { overheadStatus, radarState } from './overheadStatus'

const now = Date.UTC(2026, 10, 18, 12, 0)
const fine = { online: true, cloudFailed: false, mapFailed: false, ready: true }
const radar = { online: true, radarFailed: false, latestRadar: now - 10 * 60_000, hasOutlook: true, slow: false, now,
  timezone: 'Asia/Jerusalem' }

describe('overhead problem line', () => {
  it('is empty when everything loaded', () => {
    expect(overheadStatus(fine)).toBe('')
  })

  it('says it is loading until the first frame is ready', () => {
    expect(overheadStatus({ ...fine, ready: false })).toBe('טוען תמונות…')
  })

  it('names what failed and what still works', () => {
    expect(overheadStatus({ ...fine, cloudFailed: true })).toBe('תמונת העננים לא נטענה. הגשם מוצג כרגיל.')
    expect(overheadStatus({ ...fine, mapFailed: true, cloudFailed: true })).toBe('המפה לא נטענה. הגשם והעננים מוצגים בלי קווי חוף.')
  })

  it('leaves being offline to the headline', () => {
    expect(overheadStatus({ ...fine, online: false, ready: false })).toBe('')
  })
})

describe('radar state for the headline', () => {
  it('is fine with a fresh frame and an outlook', () => {
    expect(radarState(radar)).toEqual({ kind: 'ok' })
  })

  it('puts offline first, then failure', () => {
    expect(radarState({ ...radar, online: false, radarFailed: true })).toEqual({ kind: 'offline' })
    expect(radarState({ ...radar, radarFailed: true })).toEqual({ kind: 'failed' })
    expect(radarState({ ...radar, latestRadar: null })).toEqual({ kind: 'failed' })
  })

  it('says when the newest frame is too old, with its clock and age', () => {
    expect(radarState({ ...radar, latestRadar: now - 90 * 60_000, hasOutlook: false }))
      .toEqual({ kind: 'stale', clock: '12:30', ago: 'לפני שעה וחצי' })
  })

  it('waits for the outlook, then gives up', () => {
    expect(radarState({ ...radar, hasOutlook: false })).toEqual({ kind: 'loading' })
    expect(radarState({ ...radar, latestRadar: undefined, hasOutlook: false })).toEqual({ kind: 'loading' })
    expect(radarState({ ...radar, hasOutlook: false, slow: true })).toEqual({ kind: 'failed' })
  })
})
