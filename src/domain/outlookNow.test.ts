import { describe, expect, it } from 'vitest'
import { outlookNow, RADAR_STALE_MIN, type RadarOutlook } from './outlookNow'

const at = Date.UTC(2026, 10, 18, 12, 0)
const minutes = (m: number) => at + m * 60_000
const base: RadarOutlook = {
  at, now: 0, arrivesIn: 40, lastsFor: 30, band: 2,
  nearest: { km: 20, bearing: 270, band: 2 }, approach: { km: 20, bearing: 270 }, motion: { kmh: 30, heading: 90 },
}

describe('outlook as of now', () => {
  it('is unchanged when read at the frame time', () => {
    expect(outlookNow(base, at)).toEqual(base)
  })

  it('counts arrival from now, not from the radar frame', () => {
    expect(outlookNow(base, minutes(15))?.arrivesIn).toBe(25)
  })

  it('never says less than five minutes', () => {
    expect(outlookNow(base, minutes(38))?.arrivesIn).toBe(5)
  })

  it('shortens how long rain that is already falling lasts, but not rain still on its way', () => {
    expect(outlookNow(base, minutes(10))?.lastsFor).toBe(30)
    expect(outlookNow({ ...base, now: 1, arrivesIn: null }, minutes(10))?.lastsFor).toBe(20)
    expect(outlookNow({ ...base, now: 1, arrivesIn: null, lastsFor: 'longer' }, minutes(10))?.lastsFor).toBe('longer')
  })

  it('keeps where the rain was seen', () => {
    const aged = outlookNow(base, minutes(20))
    expect(aged?.nearest).toEqual(base.nearest)
    expect(aged?.approach).toEqual(base.approach)
  })

  it('drops an outlook whose radar frame is too old (offline, or the radar stopped)', () => {
    expect(outlookNow(base, minutes(RADAR_STALE_MIN))).not.toBeNull()
    expect(outlookNow(base, minutes(RADAR_STALE_MIN + 1))).toBeNull()
    expect(outlookNow(base, minutes(120))).toBeNull()
  })
})
