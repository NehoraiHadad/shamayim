import { describe, expect, it } from 'vitest'
import { sceneDragTime } from './sceneDragTime'

const NOW = '2026-11-17T14:30'
const FIRST = '2026-11-17T14:00'
const LAST = '2026-11-18T13:00'

describe('valley drag time', () => {
  it('emits nothing before movement and restores a preview at the starting x', () => {
    const drag = { x: 100, at: '2026-11-17T15:00', moved: false }
    expect(sceneDragTime(drag, 100, NOW, FIRST, LAST)).toBeUndefined()
    expect(sceneDragTime(drag, 99, NOW, FIRST, LAST)).toBe('2026-11-17T15:04')
    expect(sceneDragTime({ ...drag, moved: true }, 100, NOW, FIRST, LAST)).toBe(drag.at)
    expect(sceneDragTime(drag, 116, NOW, FIRST, LAST)).toBe(FIRST)
  })

  it('returns to the current minute when a live drag crosses its origin after a tick', () => {
    const drag = { x: 100, at: null, moved: false }
    expect(sceneDragTime(drag, 101, NOW, FIRST, LAST)).toBe('2026-11-17T14:26')
    const latest = '2026-11-17T14:31'
    expect(sceneDragTime({ ...drag, moved: true }, 100, latest, FIRST, LAST)).toBe(latest)
  })
})
