import { expect, it } from 'vitest'
import type { Painter, SharedPainters, Style } from './contract'
import { SHARED } from './shared/painters'

const paint: Painter<'outside'> = { form: () => {} }

it('keeps a kind each style paints its own way out of the shared painters', () => {
  const wide = { ...SHARED, outside: paint }
  // @ts-expect-error: `outside` is each style's own, however wide the object it comes in
  const shared: SharedPainters = wide
  expect(shared).toBe(wide)
  expect(Object.keys(SHARED)).not.toContain('outside')
})

it('asks every style for every kind', () => {
  // @ts-expect-error: the kinds each style paints its own way are not here
  const painters: Style['painters'] = { ...SHARED }
  expect(Object.keys(painters)).toEqual(Object.keys(SHARED))
})
