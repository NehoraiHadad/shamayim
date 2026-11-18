import { expect, it } from 'vitest'
import type { SkylineColumn } from '../../../../data/city/skylineData'
import { skylineLights } from './skylineLights'
import { skylineColumns, skylinePaths } from './skylinePaths'

const face = { top: 80.2, foot: 100.2, km: .8, cover: 1, pitch: 2 }

it('merges adjacent equal faces and tapers the near band into the settlement', () => {
  const columns: SkylineColumn[] = [
    { left: 0, right: 2, faces: [face, null, null] },
    { left: 2, right: 4, faces: [face, null, null] },
    { left: 4, right: 6, faces: [face, null, null] },
  ]
  const tapered = skylineColumns(columns, 5, 0)
  expect(tapered[2].faces[0]).toBeNull()
  expect(tapered[1].faces[0]!.top).toBeGreaterThan(tapered[0].faces[0]!.top)
  const merged = skylinePaths(skylineColumns(columns, 100, 0), [])
  expect(merged.map(({ band }) => band)).toEqual([2, 1, 0])
  expect(merged[2]).toMatchObject({ d: 'M0 80H6V100H0Z', opacity: 1 })
})

it('keeps deterministic night windows within two paths and caps their count', () => {
  const columns: SkylineColumn[] = Array.from({ length: 180 }, (_, col) => ({
    left: 2 * col, right: 2 * col + 2,
    faces: [face, { ...face, top: 55, km: 2 }, { ...face, top: 20, km: 5 }],
  }))
  const lights = skylineLights(columns, 1, 38, 12)
  expect(lights).toEqual(skylineLights(columns, 1, 38, 12))
  expect(lights).toHaveLength(2)
  expect(lights.reduce((sum, { d }) => sum + (d.match(/M/g)?.length ?? 0), 0)).toBe(220)
  expect(skylineLights(columns, 0, 38)).toEqual([])
})
