import { afterEach, expect, it, vi } from 'vitest'
import { makeForecast } from '../test/makeForecast'
import { readCache, writeCache } from './cache'

afterEach(() => vi.unstubAllGlobals())

it('round-trips the new forecast shape using v4 and ignores v3', () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value) })
  const f = makeForecast([{ max: 26, min: 15 }], undefined, {
    nowcast: [{ time: '2026-07-14T10:00', precipitation: 0.2 }],
    normals: { '2026-07-14': { tempMax: 22, tempMaxSd: 2, tempMin: 15, gustMax: 40, gustMaxSd: 8 } },
  })
  storage.set('shamayim:v3:test', JSON.stringify(f))
  expect(readCache('test')).toBeNull()
  writeCache(f)
  expect(storage.has('shamayim:v4:test')).toBe(true)
  expect(readCache('test')).toEqual(f)
})
