import { describe, expect, it } from 'vitest'
import { lifeClockAt } from './useLifeClock'

describe('life clock', () => {
  const timezone = 'Asia/Jerusalem'
  const minute = Date.parse('2026-11-17T10:00:00Z')

  it('sets the current minute from wall time and anchors it at the same scene phase', () => {
    expect(lifeClockAt('2026-11-17T12:00', null, timezone, minute + 37_000, 50)).toEqual({ laidAt: 50, sinceS: 37 })
  })

  it('preserves sub-second time either side of a render just after a minute boundary', () => {
    expect(lifeClockAt('2026-11-17T12:00', null, timezone, minute + 60_087, 73.087)).toEqual({ laidAt: 73.087, sinceS: 60.087 })
    expect(lifeClockAt('2026-11-17T12:01', null, timezone, minute + 60_087, 73.087)).toEqual({ laidAt: 73.087, sinceS: 0.087 })
  })

  it('starts a scrub at the selected minute regardless of the current wall time', () => {
    const selected = '2026-11-17T14:25'
    expect(lifeClockAt(selected, selected, timezone, minute + 60_087, 73.087)).toEqual({ laidAt: 73.087, sinceS: 0 })
  })
})
