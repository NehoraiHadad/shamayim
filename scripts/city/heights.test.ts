import { describe, expect, it } from 'vitest'
import { NearbyHeights, resolveHeight, taggedHeight } from './heights'

const point = { lat: 32, lon: 34.8 }
describe('building heights', () => {
  it('uses the height chain in order and ignores roof levels', () => {
    const nearby = new NearbyHeights()
    const height = (tags: Parameters<typeof resolveHeight>[0], residential = false) =>
      resolveHeight(tags, residential, point, nearby)
    expect(height({ height: '31 m', 'building:levels': '9', building: 'house' }).height).toBe(31)
    expect(height({ 'building:levels': '9', 'roof:levels': '4', building: 'house' }).height).toBe(28.8)
    expect(height({ building: 'house' }).height).toBe(6.4)
    expect(height({ building: 'commercial' }).height).toBe(8)
    expect(height({ building: 'yes' })).toEqual({ height: 9.6, source: 'inferred' })
  })

  it('reads storeys from the footprint when nothing else is known', () => {
    const nearby = new NearbyHeights()
    const at = (area: number, residential = true) => resolveHeight({ building: 'yes' }, residential, { ...point, area },
      nearby)
    expect(at(100)).toEqual({ height: 6.4, source: 'footprint' })
    expect(at(300).height).toBeCloseTo(12.8)
    expect(at(800).height).toBeCloseTo(19.2)
    expect(at(2000).height).toBeCloseTo(25.6)
    expect(at(2000, false).height).toBeCloseTo(9.6)
  })

  it('rejects unnamed supertall tags and retains named towers', () => {
    expect(taggedHeight({ height: '400' })).toBeUndefined()
    expect(taggedHeight({ 'building:levels': '90' })).toBeUndefined()
    expect(taggedHeight({ height: '400', 'building:levels': '5' })).toBe(16)
    expect(taggedHeight({ height: '350', 'name:he': 'מגדל' })).toBe(350)
  })

  it('needs five valid samples within 500 m and comes after type', () => {
    const nearby = new NearbyHeights()
    for (const [i, height] of [11, 12, 13, 14].entries()) nearby.add({ ...point, lat: point.lat + i / 1000 }, height)
    nearby.add({ ...point, lat: point.lat + .006 }, 50)
    expect(nearby.median(point)).toBeUndefined()
    nearby.add({ ...point, lon: point.lon - .002 }, 20)
    expect(nearby.median(point)).toBe(13)
    expect(resolveHeight({}, false, point, nearby).height).toBe(13)
    expect(resolveHeight({ building: 'yes' }, true, { ...point, area: 2000 }, nearby).height).toBe(13)
    expect(resolveHeight({ building: 'apartments' }, false, point, nearby).height).toBe(12.8)
  })
})
