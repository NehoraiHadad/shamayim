import { describe, expect, it } from 'vitest'
import { flashAt, trackAt } from './anim'
import { flightInView, LIFE_START, poseTrack, trackBaseAlpha } from './lifeTracks'
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

  it('keeps a scaled sprite that enters from offscreen and fades in from zero', () => {
    const first = { x: -12, y: 10, scale: 0.5, alpha: 0 }
    const last = { x: -3, y: 10, scale: 2, alpha: 0.4 }
    const bounds = { x: -2, y: -2, w: 4, h: 4 }
    expect(flightInView([first], bounds, 100, 100)).toBe(false)
    expect(flightInView([first, { ...last, scale: 1 }], bounds, 100, 100)).toBe(false)
    expect(flightInView([first, last], bounds, 100, 100)).toBe(true)
    const flight = poseTrack([first, last], LIFE_START)
    expect([0, 1, 2].map((time) => trackBaseAlpha(first) * trackAt(flight, time)!.alpha)).toEqual([0, 0.2, 0.4])
  })

  it('crosses the rear azimuth seam without traversing the visible sky', () => {
    const first = { x: 455, y: 10, scale: 1, alpha: 1 }
    const flight = poseTrack([first, { ...first, x: -80 }], LIFE_START, { min: -82.5, period: 540 })
    const x = (time: number) => first.x + trackAt(flight, time)!.x
    expect(x(0.5)).toBeCloseTo(456.25)
    expect(x(1.5)).toBeCloseTo(-81.25)
  })

  it('keeps closed tracks wrapped, absent between passes and frozen at their original rest pose', () => {
    const drip: Track = { path: [[0, 0], [8, -4]], step: 2, cycle: 8, at: 1 }
    expect(trackAt(drip, 3)).toBeNull()
    expect(trackAt(drip, 8)).toEqual({ ...origin, x: 4, y: -2 })
    expect(trackAt(drip, 3, true)).toEqual(trackAt(drip, 0))
  })

  it('flashes a meteor once even when it was laid long after the scene started', () => {
    const first = 1600
    const spec: AnimSpec = { mode: 'settle', pulse: { first, look: 'meteor' } }
    expect(flashAt(spec, first - 0.01)).toBe(0)
    expect(flashAt(spec, first + 0.1)).toBe(1)
    expect(flashAt(spec, first + 0.71)).toBe(0)
    expect(flashAt(spec, first + 900.1)).toBe(0)
    expect(flashAt(spec, first + 1e9 + 0.1)).toBe(0)
  })
})
