import { describe, expect, it } from 'vitest'
import { addMinutes, minutesBetweenLocal } from './minutes'

describe('local minute arithmetic', () => {
  it('crosses midnight in either direction', () => {
    expect(addMinutes('2026-11-17T23:58', 5)).toBe('2026-11-18T00:03')
    expect(addMinutes('2026-11-17T00:02', -5)).toBe('2026-11-16T23:57')
  })
  it('measures across dates', () => expect(minutesBetweenLocal('2026-11-17T23:30', '2026-11-18T01:00')).toBe(90))
})
