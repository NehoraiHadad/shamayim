import { expect, it } from 'vitest'
import type { Cluster } from './clusterTypes'
import { clusterRoofs, clusterStyle } from './villageStyle'

const base: Cluster = {
  id: 1, dx: [-1, 1], dy: [-1, 1], centre: { dx: 0, dy: 0 }, nearest: 0, urban: false,
  squares: 10, measured: 10, shareSum: 20, levels: 2, upper: 6, bands: [],
  form: { size: 3, big: 0, pitched: 0, flat: 0, evidence: 0, tagged: 0 },
}
const node = (kind: 0 | 1 | 2, faith: 0 | 1 | 2 | 3 | 4 | 5 = 0) => ({ name: 'fixture', kind, faith })

it('uses block evidence before desert and flat roof rules', () => {
  expect(clusterStyle({ ...base, place: node(0, 4) }, true)).toBe('blocks')
  const tall = { ...base, levels: 3.5, form: { ...base.form, evidence: .3 } }
  expect(clusterStyle(tall, true)).toBe('blocks')
  expect(clusterStyle({ ...tall, form: { ...tall.form, evidence: .29 } }, true)).toBe('flat-desert')
  const big = { ...base, form: { ...base.form, size: 5, big: .5 } }
  expect(clusterStyle({ ...big, place: node(1) }, false)).toBe('blocks')
  expect(clusterStyle({ ...big, place: node(2) }, false)).toBe('tile')
})

it('uses five unique roof tags and requires a flat majority', () => {
  const form = { ...base.form, flat: .3, pitched: .2, tagged: 5 }
  expect(clusterStyle({ ...base, form }, false)).toBe('flat-hill')
  expect(clusterStyle({ ...base, form: { ...form, tagged: 4 } }, false)).toBe('tile')
  expect(clusterStyle({ ...base, form: { ...form, pitched: .3 } }, false)).toBe('tile')
  expect(clusterStyle({ ...base, form: { ...form, flat: .5, tagged: undefined } }, false)).toBe('flat-hill')
})

it('never reads the roofs from who lives in the place', () => {
  const pitched = { ...base.form, flat: .1, pitched: .6, tagged: 5 }
  expect(clusterStyle({ ...base, form: pitched, place: node(2, 2) }, false)).toBe('tile')
  expect(clusterStyle({ ...base, form: { ...pitched, flat: .7 }, place: node(2, 1) }, false)).toBe('flat-hill')
  for (const faith of [0, 1, 2, 3, 4, 5] as const) {
    const cluster = { ...base, place: node(2, faith) }
    expect(clusterRoofs(cluster)).toBeUndefined()
    expect(clusterStyle(cluster, false)).toBe('tile')
    expect(clusterStyle(cluster, true)).toBe('flat-desert')
  }
})

it('knows the roofs only from five or more mapped roof shapes', () => {
  const form = { ...base.form, flat: .3, pitched: .2, tagged: 5 }
  expect(clusterRoofs({ ...base, form })).toBe('flat')
  expect(clusterRoofs({ ...base, form: { ...form, pitched: .4 } })).toBe('tile')
  expect(clusterRoofs({ ...base, form: { ...form, tagged: 4 } })).toBeUndefined()
})
