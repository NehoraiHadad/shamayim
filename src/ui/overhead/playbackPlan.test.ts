import { describe, expect, it } from 'vitest'
import { FRAME_MS, HOLD_MS, LOOPS, nextStep, REDUCED_FRAME_MS, type Step } from './playbackPlan'

/** Every step from frame 0 until playback stops. */
function run(last: number, options: { reduced: boolean; looping: boolean }) {
  const steps: Step[] = []
  let state: Step | null = { at: 0, loop: 0, delay: 0 }
  while (state && steps.length < 200) {
    steps.push(state)
    state = nextStep(state.at, state.loop, last, options)
  }
  return steps
}

describe('radar playback plan', () => {
  it('plays once on open and rests on the newest frame', () => {
    const steps = run(12, { reduced: false, looping: false })
    expect(steps.map((s) => s.at)).toEqual([...Array(13).keys()])
    expect(steps.slice(1).every((s) => s.delay === FRAME_MS)).toBe(true)
    // 13 frames at 400 ms: about 5 s, slow enough to read as a movie.
    expect(steps.reduce((sum, s) => sum + s.delay, 0)).toBe(12 * FRAME_MS)
  })

  it('loops at most three times when asked, holding on the newest frame between loops', () => {
    const steps = run(12, { reduced: false, looping: true })
    expect(steps).toHaveLength(13 * LOOPS)
    expect(steps.filter((s) => s.delay === HOLD_MS)).toHaveLength(LOOPS - 1)
    expect(steps.at(-1)).toMatchObject({ at: 12, loop: LOOPS - 1 })
  })

  it('with reduced motion plays once, slower, even when asked to loop', () => {
    const steps = run(12, { reduced: true, looping: true })
    expect(steps).toHaveLength(13)
    expect(steps.slice(1).every((s) => s.delay === REDUCED_FRAME_MS)).toBe(true)
  })

  it('does nothing with a single frame', () => {
    expect(nextStep(0, 0, 0, { reduced: false, looping: true })).toBeNull()
  })
})
