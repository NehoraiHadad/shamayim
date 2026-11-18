import { expect, it } from 'vitest'
import { cellSpans } from './rayWalk'
import { EARTH_R_KM } from '../terrain/panorama'

it('cuts and clips a ray at square edges, retaining distances and signed global square coordinates', () => {
  const kmPerDegree = EARTH_R_KM * Math.PI / 180
  const toGrid = (_lat: number, lon: number) => [lon * kmPerDegree - .5, 1.5] as const
  const walk = (bounds?: readonly [number, number]) =>
    [...cellSpans({ lat: 0, lon: 0 }, 90, 0, 2, { toGrid, bounds })]
  const expected = [
    { col: -1, row: 1, start: 0, end: .5 },
    { col: 0, row: 1, start: .5, end: 1 },
    { col: 0, row: 1, start: 1, end: 1.5 },
    { col: 1, row: 1, start: 1.5, end: 2 },
  ]
  const close = ({ start, end, ...cell }: typeof expected[number]) =>
    ({ ...cell, start: expect.closeTo(start, 8), end: expect.closeTo(end, 8) })
  expect(walk()).toMatchObject(expected.map(close))
  expect(walk([1, 2])).toMatchObject(expected.slice(1, 3).map(close))
})
