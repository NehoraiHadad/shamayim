import { describe, expect, it } from 'vitest'
import { utcOf } from '../astro/utc'
import { openSky } from '../test/eventForecast'
import { seen } from './seen'
import type { Candidate } from './types'

const sky = openSky('2026-11-25T12:00')
const local = (clock: string) => utcOf(`2026-11-25T${clock}`, sky.place.timezone).getTime()
const where = { azimuth: 120, altitude: 30 }

describe('special event viewing windows', () => {
  it('includes an occultation contact off the sampling grid until it passes', () => {
    const contact = local('19:12') + 20_000
    const c: Candidate = { what: 'התכסות', from: contact, to: contact, tell: 'at', perYear: 1, approximateTime: true, at: () => where }
    expect(seen(c, sky)).toMatchObject({ when: { from: '2026-11-25T19:12', to: '2026-11-25T19:12' }, approximateTime: true })
    expect(seen(c, { ...sky, from: contact + 1 })).toBeNull()
  })

  it('keeps an exact eclipse maximum only if it is in the visible window', () => {
    const from = local('13:30'), to = local('15:20'), peakAt = local('14:13') + 15_000
    const c: Candidate = { what: 'ליקוי חמה חלקי', kind: 'solar-eclipse', from, to, peakAt, perYear: 0.5, tell: 'span',
      cloud: { all: 0.6 }, at: () => where }
    expect(seen(c, sky)).toMatchObject({ peak: '2026-11-25T14:13', kind: 'solar-eclipse' })
    const hidden = { ...sky, coversAt: (ms: number) => ms === peakAt ? { low: 1, mid: 0, high: 0 } : sky.coversAt(ms) }
    expect(seen(c, hidden)).toMatchObject({ kind: 'solar-eclipse' })
    expect(seen(c, hidden)?.peak).toBeUndefined()
  })

  it('uses the direction at the end of the visible part of a moving pass', () => {
    const from = local('19:00'), to = local('19:04')
    const c: Candidate = { what: 'מעבר', from, to, tell: 'span', stepMin: 1, track: true, perYear: 9,
      at: (ms) => ({ altitude: 20, azimuth: (ms - from) / 60_000 * 30 + 180 }) }
    expect(seen(c, { ...sky, clear: (p) => p.azimuth <= 240 })).toMatchObject({
      where: { altitude: 20, azimuth: 180 }, track: { to: { altitude: 20, azimuth: 240 } }, when: { to: '2026-11-25T19:02' },
    })
  })

  it('prefers a later clear window when the first opportunity is cloud-dependent', () => {
    const from = local('19:00'), to = local('19:40')
    const c: Candidate = { what: 'תצפית', from, to, tell: 'from', stepMin: 5, perYear: 1, cloud: { all: 0.6 }, at: () => where }
    const coversAt = (ms: number) => ({ low: ms < local('19:15') ? 0.5 : ms < local('19:25') ? 0.8 : 0, mid: 0, high: 0 })
    expect(seen(c, { ...sky, coversAt })).toMatchObject({ viewing: 'expected', when: { from: '2026-11-25T19:25' } })
  })
})
