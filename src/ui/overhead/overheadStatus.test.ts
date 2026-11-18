import { describe, expect, it } from 'vitest'
import { overheadStatus } from './overheadStatus'

const fine = { online: true, radarFailed: false, cloudFailed: false, mapFailed: false, ready: true }

describe('overhead status line', () => {
  it('is empty when everything loaded', () => {
    expect(overheadStatus(fine)).toBe('')
  })

  it('says it is loading until the first frame is ready', () => {
    expect(overheadStatus({ ...fine, ready: false })).toBe('טוען תמונות…')
  })

  it('names every source that failed, in a fixed order', () => {
    expect(overheadStatus({ ...fine, mapFailed: true, radarFailed: true })).toBe('לא הצלחנו לטעון מכ״ם · מפה')
    expect(overheadStatus({ ...fine, cloudFailed: true, ready: false })).toBe('לא הצלחנו לטעון לוויין')
  })

  it('puts being offline before anything else', () => {
    expect(overheadStatus({ ...fine, online: false, radarFailed: true })).toBe('אין חיבור')
  })
})
