import { afterEach, describe, expect, it, vi } from 'vitest'
import { mapNowcast } from './mapNowcast'

const block = () => ({ time: ['2026-11-17T10:00', '2026-11-17T10:15'],
  precipitation_icon_seamless: [1, null], precipitation_ecmwf_ifs025: [0.5, 0.2] })
afterEach(() => vi.restoreAllMocks())

describe('mapNowcast', () => {
  it('blends suffixed model columns with day-zero weights, including one-model fallback', () => {
    const points = mapNowcast({ minutely_15: block() })
    expect(points?.[0].precipitation).toBeCloseTo(0.8)
    expect(points?.[1]).toEqual({ time: '2026-11-17T10:15', precipitation: 0.2 })
  })
  it('returns null quietly for missing or empty blocks', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(mapNowcast({})).toBeNull()
    expect(mapNowcast({ minutely_15: { time: [] } })).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })
  it.each([
    { time: ['bad'] }, { ...block(), precipitation_icon_seamless: [1] },
    { ...block(), precipitation_icon_seamless: ['bad', 0] },
    { ...block(), precipitation_icon_seamless: [-1, 0] },
    { ...block(), time: ['2026-11-17T10:00', '2026-11-17T10:30'] },
    { time: block().time },
  ])('ignores malformed data with a warning: %o', (minutely_15) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(mapNowcast({ minutely_15 })).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
  })
})
