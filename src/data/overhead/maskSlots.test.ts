import { describe, expect, it } from 'vitest'
import { candidateSlots, slotBeforeLowSun, STEP_MS, sunAt } from './maskSlots'

const LAT = 32.348, LON = 35.535
const at = (hour: number, minute = 0) => Date.UTC(2026, 10, 24, hour, minute)
const clock = (time: number) => new Date(time).toISOString().slice(11, 16)

describe('candidateSlots', () => {
  it('tries the newest slot that may be out (~15 min late) first, then older ones', () => {
    expect(candidateSlots(Date.UTC(2026, 10, 18, 15, 0)).map(clock)).toEqual(['14:45', '14:30', '14:15'])
  })
})

describe('slotBeforeLowSun', () => {
  it('is the last slot in daylight, for an evening', () => {
    for (const slot of [at(13, 30), at(14, 30), at(16), at(18)]) {
      const before = slotBeforeLowSun(slot, LAT, LON)!
      expect(clock(before)).toBe('13:00')
      expect(sunAt(before + STEP_MS, LAT, LON)).toBeLessThan(14)
    }
  })
  it('is the last slot of the night, for a morning', () => {
    const before = slotBeforeLowSun(at(5), LAT, LON)!
    expect(sunAt(before, LAT, LON)).toBeLessThan(-12)
    expect(sunAt(before + STEP_MS, LAT, LON)).toBeGreaterThan(-12)
  })
  it('asks nothing by day, with the ground long cold or before dawn', () => {
    for (const slot of [at(9), at(12, 30), at(18, 15), at(21), at(1)]) expect(slotBeforeLowSun(slot, LAT, LON)).toBeNull()
  })
})
