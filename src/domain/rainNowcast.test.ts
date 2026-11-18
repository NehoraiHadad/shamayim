import { describe, expect, it } from 'vitest'
import { motionBetween, rainOutlook, type EchoGrid } from './rainNowcast'
import { rainSentence } from './rainSentence'

const SIZE = 41
const KM = 4
const clock = (m: number) => `+${m}`

/** A square blob of echoes whose centre is (cx, cy) cells off the place (x east, y south). */
function grid(blobs: { cx: number; cy: number; r: number; band?: number }[]): EchoGrid {
  const cells = new Uint8Array(SIZE * SIZE)
  const c = (SIZE - 1) / 2
  for (const { cx, cy, r, band = 2 } of blobs)
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const gx = c + cx + x, gy = c + cy + y
        if (gx >= 0 && gy >= 0 && gx < SIZE && gy < SIZE) cells[gy * SIZE + gx] = band
      }
  return { size: SIZE, kmPerCell: KM, cells }
}

describe('radar nowcast', () => {
  it('measures a band of rain moving east', () => {
    const v = motionBetween(grid([{ cx: -14, cy: 0, r: 3 }]), grid([{ cx: -10, cy: 0, r: 3 }]), 30)
    expect(v).toEqual({ vx: 4 / 30, vy: 0 })
  })

  it('says when rain coming from the west arrives and how long it stays', () => {
    // 4 cells (16 km) in 30 min = 32 km/h. The near edge is 7 cells west, so it is over the place in ~45-55 min.
    const o = rainOutlook(grid([{ cx: -14, cy: 0, r: 3 }]), grid([{ cx: -10, cy: 0, r: 3 }]), 30)
    expect(o.now).toBe(0)
    expect(o.arrivesIn).toBeGreaterThanOrEqual(40)
    expect(o.arrivesIn).toBeLessThanOrEqual(55)
    expect(o.lastsFor).toBe('longer')
    expect(o.motion?.heading).toBeCloseTo(90)
    expect(rainSentence(o, clock, null)).toMatch(/^גשם מתקרב ממערב\. הוא צפוי להגיע לאזור שלך בעוד כ־\d+ דקות, בסביבות \+\d+, ונראה שיימשך זמן רב\.$/)
  })

  it('says where the arriving rain is at the radar frame’s time', () => {
    const o = rainOutlook(grid([{ cx: -14, cy: 0, r: 3 }]), grid([{ cx: -10, cy: 0, r: 3 }]), 30)
    // 32 km/h for `arrivesIn` minutes, straight west of the place.
    expect(o.approach?.bearing).toBeCloseTo(270)
    expect(o.approach?.km).toBeCloseTo((32 * o.arrivesIn!) / 60)
  })

  it('has no approach when nothing is heading here or the rain is already overhead', () => {
    expect(rainOutlook(grid([{ cx: 0, cy: -14, r: 3 }]), grid([{ cx: 4, cy: -14, r: 3 }]), 30).approach).toBeNull()
    expect(rainOutlook(grid([{ cx: -4, cy: 0, r: 3 }]), grid([{ cx: 0, cy: 0, r: 3 }]), 30).approach).toBeNull()
  })

  it('says when rain over the place will stop', () => {
    const o = rainOutlook(grid([{ cx: -4, cy: 0, r: 3, band: 1 }]), grid([{ cx: 0, cy: 0, r: 3, band: 1 }]), 30)
    expect(o.now).toBe(1)
    expect(o.lastsFor).toBeGreaterThan(15)
    expect(rainSentence(o, clock, null)).toMatch(/^יורד עכשיו גשם קל\. לפי תנועת העננים הוא צפוי להיפסק בעוד/)
  })

  it('says nearby rain is passing by when it moves away', () => {
    const o = rainOutlook(grid([{ cx: -8, cy: 0, r: 2 }]), grid([{ cx: -8, cy: -4, r: 2 }]), 30)
    expect(o.arrivesIn).toBeNull()
    expect(rainSentence(o, clock, null)).toBe('יש גשם כ־30 ק״מ מערבית לך. הוא נע צפונה ולא צפוי להגיע אליך בשעה וחצי הקרובה.')
  })

  it('without motion only says where the rain is', () => {
    const o = rainOutlook(null, grid([{ cx: 0, cy: 6, r: 2 }]), 30)
    expect(o.motion).toBeNull()
    expect(rainSentence(o, clock, null)).toBe('יש גשם כ־15 ק״מ דרומית לך.')
  })

  it('falls back to the forecast when the radar is dry', () => {
    const dry = rainOutlook(null, grid([]), 30)
    expect(rainSentence(dry, clock, '16:00')).toBe('עדיין אין גשם באזור, אבל התחזית צופה גשם בסביבות 16:00.')
    expect(rainSentence(dry, clock, null)).toBe('אין גשם בכל הסביבה, עד מאות קילומטרים ממך.')
  })
})
