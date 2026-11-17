import { describe, expect, it } from 'vitest'
import { nowcastPoints } from '../test/nowcastPoints'
import { nowcastOf } from './nowcast'
import { nowcastPhrase } from './phrases'

const now = '2026-11-17T10:00'
const points = (fn: (i: number) => number) => nowcastPoints(now, fn)
describe('nowcastOf', () => {
  it('starts in 30 minutes when consecutive wet slots confirm it', () => {
    expect(nowcastOf(points((i) => i >= 3 ? 0.1 : 0), now)).toEqual({ kind: 'start', minutes: 30 })
  })
  it('stops in 15 minutes after two dry slots', () => {
    expect(nowcastOf(points((i) => i < 2 ? 0.8 : 0), now)).toEqual({ kind: 'stop', minutes: 15 })
  })
  it('ignores a short light blip but accepts a single 0.3mm slot', () => {
    expect(nowcastOf(points((i) => i === 3 ? 0.1 : 0), now)).toBeNull()
    expect(nowcastOf(points((i) => i === 3 ? 0.3 : 0), now)).toEqual({ kind: 'start', minutes: 30 })
  })
  it('ignores one dry slot and waits for a sustained dry run', () => {
    expect(nowcastOf(points((i) => i === 2 || i >= 5 ? 0 : 0.8), now)).toEqual({ kind: 'stop', minutes: 60 })
  })
  it('stays quiet when wet or dry for the whole horizon', () => {
    expect(nowcastOf(points(() => 0), now)).toBeNull()
    expect(nowcastOf(points(() => 0.8), now)).toBeNull()
    expect(nowcastOf(null, now)).toBeNull()
  })
  it('treats a boundary as the end of the covering interval', () => {
    const p = points((i) => i === 0 ? 0.8 : 0)
    expect(nowcastOf(p, now)).toEqual({ kind: 'stop', minutes: 0 })
    expect(nowcastOf(p, '2026-11-17T10:01')).toBeNull()
    expect(nowcastOf(p, '2026-11-17T09:45')).toBeNull()
  })
  it('keeps confirmations within the two-hour horizon and ignores stale data or gaps', () => {
    expect(nowcastOf(points((i) => i === 9 ? 0.8 : 0), now)).toBeNull()
    expect(nowcastOf(points(() => 0.8), '2026-11-17T14:00')).toBeNull()
    const p = points((i) => i >= 3 ? 0.2 : 0)
    p.splice(2, 1)
    expect(nowcastOf(p, now)).toBeNull()
  })
  it('works across midnight in the place timezone', () => {
    expect(nowcastOf(nowcastPoints('2026-11-17T23:45', (i) => i >= 3 ? 0.8 : 0), '2026-11-17T23:45'))
      .toEqual({ kind: 'start', minutes: 30 })
  })
})

describe('nowcastPhrase', () => {
  it.each([[0, 'בדקות הקרובות'], [9, 'בדקות הקרובות'], [10, 'בעוד כרבע שעה'], [15, 'בעוד כרבע שעה'],
    [29, 'בעוד כחצי שעה'], [44, 'בעוד כשלושה רבעי שעה'], [61, 'בעוד כשעה'], [88, 'בעוד כשעה וחצי'], [120, 'בעוד כשעתיים']])
  ('snaps %i minutes to %s', (minutes, when) => {
    expect(nowcastPhrase({ kind: 'start', minutes })).toBe(`גשם צפוי להתחיל ${when}.`)
    expect(nowcastPhrase({ kind: 'stop', minutes })).toBe(`הגשם צפוי להיפסק ${when}.`)
  })
})
