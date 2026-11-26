import { describe, expect, it } from 'vitest'
import { sceneDragIntent, sceneDragTime } from './sceneDragTime'

const NOW = '2026-11-17T14:30'
const FIRST = '2026-11-17T14:00'
const LAST = '2026-11-18T13:00'

describe('valley drag time', () => {
  it('waits through finger drift and distinguishes a page scroll from a time drag', () => {
    expect(sceneDragIntent(7, -3)).toBeUndefined()
    expect(sceneDragIntent(8, -45)).toBe('vertical')
    expect(sceneDragIntent(9, -8)).toBe('vertical')
    expect(sceneDragIntent(-12, 3)).toBe('horizontal')
  })

  it('emits nothing before movement and restores a preview at the starting x', () => {
    const drag = { x: 100, at: '2026-11-17T15:00', moved: false }
    expect(sceneDragTime(drag, 100, NOW, FIRST, LAST)).toBeUndefined()
    expect(sceneDragTime(drag, 92, NOW, FIRST, LAST)).toBeUndefined()
    expect(sceneDragTime(drag, 91, NOW, FIRST, LAST)).toBe('2026-11-17T15:04')
    expect(sceneDragTime({ ...drag, moved: true }, 99, NOW, FIRST, LAST)).toBe(drag.at)
    expect(sceneDragTime(drag, 124, NOW, FIRST, LAST)).toBe(FIRST)
  })

  it('lands on now from a preview whose steps straddle it', () => {
    const drag = { x: 100, at: '2026-11-17T15:00', moved: true }
    // 15:00 less 28 minutes is 14:32, less 32 is 14:28: both within half a px of 14:30.
    expect(sceneDragTime(drag, 115, NOW, FIRST, LAST)).toBe(NOW)
    expect(sceneDragTime(drag, 116, NOW, FIRST, LAST)).toBe(NOW)
    expect(sceneDragTime(drag, 114, NOW, FIRST, LAST)).toBe('2026-11-17T14:36')
  })

  it('returns to the current minute when a live drag crosses its origin after a tick', () => {
    const drag = { x: 100, at: null, moved: false }
    expect(sceneDragTime(drag, 109, NOW, FIRST, LAST)).toBe('2026-11-17T14:26')
    const latest = '2026-11-17T14:31'
    expect(sceneDragTime({ ...drag, moved: true }, 100, latest, FIRST, LAST)).toBe(latest)
  })
})
