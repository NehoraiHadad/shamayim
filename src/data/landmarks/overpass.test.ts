import { describe, expect, it } from 'vitest'
import { parseOverpass } from './overpass'

describe('parseOverpass', () => {
  it('classifies heights, towers and orchards and merges nearby duplicates', () => {
    const elements = [
      { id: 1, lat: 32, lon: 35, tags: { building: 'yes', 'building:levels': '30' } },
      { id: 2, lat: 32, lon: 35.01, tags: { man_made: 'tower', 'tower:type': 'cooling' } },
      { id: 3, lat: 32, lon: 35.02, tags: { man_made: 'chimney' } },
      { id: 4, lat: 32, lon: 35.022, tags: { man_made: 'chimney', height: '90' } },
      { id: 5, lat: 32, lon: 35.03, tags: { landuse: 'orchard', trees: 'date_palms' } },
      { id: 6, lat: 32, lon: 35.04, tags: { landuse: 'orchard' } },
    ]
    const marks = parseOverpass({ elements })
    expect(marks.find((mark) => mark.kind === 'highrise')?.heightM).toBe(96)
    expect(marks.find((mark) => mark.kind === 'cooling')).toBeTruthy()
    expect(marks.filter((mark) => mark.kind === 'chimney')).toHaveLength(1)
    expect(marks.find((mark) => mark.kind === 'chimney')?.heightM).toBe(90)
    expect(marks.some((mark) => mark.kind === 'palms')).toBe(true)
    expect(marks.some((mark) => mark.kind === 'orchard')).toBe(true)
  })
})
