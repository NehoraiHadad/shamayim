import { expect, it } from 'vitest'
import type { House } from '../../../../data/landmarks/settlement'
import { massPaths } from './massPath'

const block = (x: number, h = 12.7, row = 1): House => ({ x, w: 8, h, baseY: 100, row, lit: true, seed: 1234 + x })
const day = { sunWest: true, night: false, litShare: 0, back: false }
const subpaths = (d: string) => d.split('M').length - 1

it('merges a row of blocks into one subpath each, standing on their bases', () => {
  const { body, roofs } = massPaths([block(10), block(20)], day)
  expect(subpaths(body)).toBe(2)
  expect(body).toContain('M6.0 87.3h8.0v12.7h-8.0z')
  expect(roofs).toContain('M6.0 86.7h8.0v0.6h-8.0z')
})

it('puts the lit face on the sun side and drops it in shade and at night', () => {
  expect(massPaths([block(10)], day).faces).toBe('M6.0 87.3h2.2v12.7h-2.2z')
  expect(massPaths([block(10)], { ...day, sunWest: false }).faces).toBe('M11.8 87.3h2.2v12.7h-2.2z')
  expect(massPaths([block(10)], { ...day, sunWest: null }).faces).toBe('')
  expect(massPaths([block(10)], { ...day, night: true }).faces).toBe('')
})

it('keeps panes inside the block, groups tight storeys, and lights only at night', () => {
  const tall = massPaths([block(10, 12.7)], day).panes
  const short = massPaths([block(10, 7.9)], day).panes
  expect(subpaths(short)).toBeLessThan(subpaths(tall))
  for (const [, x, y] of tall.matchAll(/M([\d.]+) ([\d.]+)/g)) {
    expect(Number(x)).toBeGreaterThanOrEqual(6)
    expect(Number(x) + .9).toBeLessThanOrEqual(14)
    expect(Number(y)).toBeGreaterThan(87.3)
  }
  expect(massPaths([block(10)], day).lights).toBe('')
  expect(massPaths([block(10)], { ...day, night: true, litShare: 0 }).lights).toBe('')
  expect(subpaths(massPaths([block(10)], { ...day, night: true, litShare: 1 }).lights)).toBeGreaterThan(0)
})

it('draws the back row as a silhouette by day', () => {
  const back = massPaths([block(10, 12.7, 0)], { ...day, back: true })
  expect(back.panes).toBe('')
  expect(subpaths(back.body)).toBe(1)
})
