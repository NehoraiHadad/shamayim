import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import { seat } from './seat'
import { composeSettlement, settlementStyle } from './settlement'
import type { Landmark } from './types'

const karmei: Place = { id: 'osm:way:462664109', nameHe: 'כרמי צור', regionHe: 'יהודה ושומרון', lat: 31.6092,
  lon: 35.1009, timezone: 'Asia/Jerusalem', usesOsm: true, featureCode: 'PPL', settlementType: 'village' }
const minaret = (id: string, lon: number): Landmark => ({ id, kind: 'minaret', lat: karmei.lat, lon, heightM: 24, source: 'osm' })
const hill = (x: number) => 40 + Math.abs(x - 187.5) * .4
const base = { size: 'small' as const, centerX: 187.5, centerY: 40, width: 375, ground: hill, litShare: 0, seed: 7 }

describe('settlement cluster', () => {
  it('picks a roof style from the data we have', () => {
    expect(settlementStyle(karmei, 'small', [minaret('a', 35.09), minaret('b', 35.089)])).toBe('tile')
    expect(settlementStyle(karmei, 'small', [minaret('a', 35.1012), minaret('b', 35.1003)])).toBe('flat-hill')
    expect(settlementStyle({ ...karmei, lat: 30.61, regionHe: 'נגב' }, 'medium', [])).toBe('flat-desert')
    expect(settlementStyle({ ...karmei, lat: 32.08 }, 'large', [])).toBe('blocks')
  })

  it('drapes a small tile village over the crest, clear of the dot and the label', () => {
    const settlement = composeSettlement({ ...base, style: 'tile' })
    expect(settlement.houses.length).toBeGreaterThanOrEqual(10)
    for (const house of settlement.houses) {
      expect(Math.abs(house.x - 187.5)).toBeLessThanOrEqual(32)
      const nx = Math.max(house.x - house.w / 2, Math.min(187.5, house.x + house.w / 2))
      const ny = Math.max(house.baseY - house.h, Math.min(40, house.baseY))
      expect(Math.hypot(nx - 187.5, ny - 40)).toBeGreaterThanOrEqual(5.5)
      if (Math.abs(house.x - 187.5) < 25 + house.w / 2) expect(house.baseY + 2).toBeLessThanOrEqual(settlement.labelTop)
    }
    expect(new Set(settlement.houses.map((house) => house.row))).toEqual(new Set([0, 1, 2]))
  })

  it('keeps houses round the absorbed hall below its roof, so its minaret stands clear inside the town', () => {
    const absorbed = [{ x: 200, w: 14, base: 46 }]
    const open = composeSettlement({ ...base, style: 'tile' })
    const settlement = composeSettlement({ ...base, style: 'tile', absorbed })
    const inSlot = (house: { x: number; w: number }) => Math.abs(house.x - 200) < (14 + house.w) / 2 + 1
    const over = (house: { baseY: number; h: number }) => house.baseY - house.h - 1.8 < 46 - 6
    expect(open.houses.some((house) => inSlot(house) && over(house))).toBe(true)
    expect(settlement.houses.some((house) => inSlot(house) && over(house))).toBe(false)
    expect(settlement.houses.filter((house) => house.row === 0).length).toBeGreaterThan(0)
  })

  it('packs a steep face into terraces near the dot instead of a staircase down it', () => {
    const face = (x: number) => 40 + (x - 187.5) * 1.3
    const settlement = composeSettlement({ ...base, size: 'large', style: 'blocks', ground: face, floor: 70 })
    expect(settlement.houses.length).toBeGreaterThan(5)
    for (const house of settlement.houses) {
      expect(face(house.x) - 40).toBeLessThanOrEqual(12)
      expect(40 - face(house.x)).toBeLessThanOrEqual(22)
      expect(house.baseY).toBeLessThanOrEqual(70)
    }
  })

  it('keeps desert rows on the plateau rim instead of down the cliff', () => {
    const cliff = (x: number) => x < 187.5 ? 40 : 40 + (x - 187.5) * 1.5
    const settlement = composeSettlement({ ...base, size: 'medium', style: 'flat-desert', ground: cliff })
    expect(settlement.houses.length).toBeGreaterThan(5)
    for (const house of settlement.houses) expect(cliff(house.x)).toBeLessThanOrEqual(45)
  })

  it('lights a stable share of houses at night', () => {
    const lit = (seed: number) => composeSettlement({ ...base, style: 'tile', litShare: .5, seed }).houses.map((h) => h.lit)
    expect(lit(3)).toEqual(lit(3))
    expect(lit(3).filter(Boolean).length).toBeGreaterThan(2)
  })

  it('never leaves a corner floating on a slope', () => {
    const slope = (x: number) => 100 - x * .577
    for (const x of [40, 60, 80]) {
      const placed = seat(slope, x, 8)!
      expect(placed.baseY).toBeGreaterThanOrEqual(slope(x - placed.w / 2))
      expect(placed.baseY).toBeGreaterThanOrEqual(slope(x + placed.w / 2))
    }
    expect(seat((x) => x * 2, 50, 8)).toBeNull()
  })

  it('keeps every house out from under the sun-event caption', () => {
    const caption = { left: 120, right: 180, top: 0, bottom: 128 }
    const open = composeSettlement({ ...base, style: 'tile' })
    const kept = composeSettlement({ ...base, style: 'tile', keepOut: [caption] })
    const under = (house: { x: number; w: number }) => house.x + house.w / 2 > caption.left - 2
      && house.x - house.w / 2 < caption.right + 2
    expect(open.houses.some(under)).toBe(true)
    expect(kept.houses.some(under)).toBe(false)
    expect(kept.houses.length).toBeGreaterThan(0)
  })
})
