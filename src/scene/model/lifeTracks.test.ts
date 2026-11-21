import { describe, expect, it } from 'vitest'
import { flashAt, trackAt } from './anim'
import type { AnimSpec, Track } from './types'

describe('flight tracks', () => {
  const track: Track = { open: true, at: -10, step: 2, path: [[0, 0], [8, -4], [10, 0]],
    scale: [1, 2, 2], alpha: [1, 0.5, 0], turn: [0, 1, 1.5] }
  const origin = { x: 0, y: 0, scale: 1, alpha: 1, turn: 0 }

  it('interpolates offsets, scale, opacity and turn and clamps at both ends', () => {
    expect(trackAt(track, 9)).toEqual(origin)
    expect(trackAt(track, 11)).toEqual({ x: 4, y: -2, scale: 1.5, alpha: 0.75, turn: 0.5 })
    expect(trackAt(track, 13)).toEqual({ x: 9, y: -2, scale: 2, alpha: 0.25, turn: 1.25 })
    expect(trackAt(track, 1000)).toEqual({ x: 10, y: 0, scale: 2, alpha: 0, turn: 1.5 })
  })

  it('holds sample 0 in reduced motion even when the minute was laid late', () => {
    expect(trackAt({ ...track, at: 37 }, 100, true)).toEqual(origin)
    expect(trackAt(undefined, 100)).toEqual(origin)
  })

  it('keeps closed tracks wrapped, absent between passes and frozen at their original rest pose', () => {
    const drip: Track = { path: [[0, 0], [8, -4]], step: 2, cycle: 8, at: 1 }
    expect(trackAt(drip, 3)).toBeNull()
    expect(trackAt(drip, 8)).toEqual({ ...origin, x: 4, y: -2 })
    expect(trackAt(drip, 3, true)).toEqual(trackAt(drip, 0))
  })

  it('flashes a meteor once even when it was laid long after the scene started', () => {
    const first = 1600
    const spec: AnimSpec = { mode: 'settle', pulse: { seed: 1, first, every: [Infinity, Infinity], look: 'meteor', cycle: Infinity } }
    expect(flashAt(spec, first - 0.01)).toBe(0)
    expect(flashAt(spec, first + 0.1)).toBe(1)
    expect(flashAt(spec, first + 0.71)).toBe(0)
    expect(flashAt(spec, first + 900.1)).toBe(0)
    expect(flashAt(spec, first + 1e9 + 0.1)).toBe(0)
  })
})
