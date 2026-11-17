import { describe, expect, it } from 'vitest'
import type { Place } from '../config/place'
import { SHADMOT_MEHOLA } from '../config/place'
import { persistPlace, readPlace, readRecentPlaces } from './placeStorage'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const place = (id: string): Place => ({ id, nameHe: id, regionHe: 'אזור', lat: 1, lon: 2, timezone: 'auto' })

describe('place persistence', () => {
  it('defaults safely and restores a selected place', () => {
    const storage = new MemoryStorage()
    expect(readPlace(storage)).toBe(SHADMOT_MEHOLA)
    persistPlace(place('one'), storage)
    expect(readPlace(storage).id).toBe('one')
  })

  it('deduplicates and limits recent places to four', () => {
    const storage = new MemoryStorage()
    ;['one', 'two', 'three', 'four', 'five', 'three'].forEach((id) => persistPlace(place(id), storage))
    expect(readRecentPlaces(storage).map(({ id }) => id)).toEqual(['three', 'five', 'four', 'two'])
  })

  it('ignores malformed stored JSON', () => {
    const storage = new MemoryStorage()
    storage.setItem('shamayim:place:v1', '{')
    expect(readPlace(storage)).toBe(SHADMOT_MEHOLA)
  })
})
