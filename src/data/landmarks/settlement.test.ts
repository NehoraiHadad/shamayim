import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import { settlementStyle } from './settlement'

const karmei: Place = { id: 'osm:way:462664109', nameHe: 'כרמי צור', regionHe: 'יהודה ושומרון', lat: 31.6092,
  lon: 35.1009, timezone: 'Asia/Jerusalem', usesOsm: true, featureCode: 'PPL', settlementType: 'village' }

describe('settlement style', () => {
  it('picks a roof style from the place alone, never from the marks round it', () => {
    expect(settlementStyle(karmei, 'small')).toBe('tile')
    expect(settlementStyle({ ...karmei, lat: 30.61, regionHe: 'נגב' }, 'medium')).toBe('flat-desert')
    expect(settlementStyle({ ...karmei, lat: 32.08 }, 'large')).toBe('blocks')
  })
})
