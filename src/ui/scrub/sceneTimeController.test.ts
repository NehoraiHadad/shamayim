import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/minutes'
import { createSceneTimeController, initialSceneTime } from './sceneTimeController'

const NOW = '2026-11-17T14:00'
const LATER = addMinutes(NOW, 60)

function sceneTime(reducedMotion = false) {
  let state = initialSceneTime
  const controller = createSceneTimeController(NOW, (next) => { state = next }, {
    setTimeout,
    clearTimeout,
    requestFrame: (callback) => setTimeout(() => callback(performance.now()), 16) as unknown as number,
    cancelFrame: (frame) => clearTimeout(frame),
    frameTime: () => performance.now(),
    reducedMotion: () => reducedMotion,
  })
  return { ...controller, get state() { return state } }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('scene time', () => {
  it('lands live during a drag, resumes preview on the next move and releases live without a hold', () => {
    const time = sceneTime()
    time.pick(LATER)
    expect(vi.getTimerCount()).toBe(1)
    time.scrub(NOW)
    expect(time.state).toEqual({ ...initialSceneTime, scrubbing: true })
    expect(vi.getTimerCount()).toBe(0)
    time.scrub(LATER)
    expect(time.state).toEqual({ at: LATER, scrubbing: true, rewinding: false })
    time.scrub(NOW)
    time.release()
    expect(time.state).toEqual(initialSceneTime)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps a held preview through a clock tick and lets a pick land on the newly committed now', () => {
    const time = sceneTime()
    const nextMinute = addMinutes(NOW, 1)
    time.pick(nextMinute)
    time.setNow(nextMinute)
    expect(time.state.at).toBe(nextMinute)
    expect(vi.getTimerCount()).toBe(1)
    time.pick(nextMinute)
    expect(time.state).toEqual(initialSceneTime)
    expect(vi.getTimerCount()).toBe(0)
    time.pick(NOW)
    expect(time.state.at).toBe(NOW)
  })

  it.each([false, true])('lands live after the same six-second hold (reduced motion %s)', (reducedMotion) => {
    const time = sceneTime(reducedMotion)
    time.scrub(LATER)
    expect(vi.getTimerCount()).toBe(0)
    time.release()
    vi.advanceTimersByTime(5999)
    expect(time.state).toEqual({ at: LATER, scrubbing: false, rewinding: false })
    vi.advanceTimersByTime(1)
    if (!reducedMotion) {
      expect(time.state.rewinding).toBe(true)
      vi.advanceTimersByTime(400)
      expect(time.state.at).not.toBe(LATER)
      expect(time.state.rewinding).toBe(true)
      vi.advanceTimersByTime(500)
    }
    expect(time.state).toEqual(initialSceneTime)
    time.pick(NOW)
    expect(vi.getTimerCount()).toBe(0)
  })
})
