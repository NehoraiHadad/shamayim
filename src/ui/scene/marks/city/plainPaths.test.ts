import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { PlainPatch } from '../../../../data/city/plainData'
import { PlainCityPaths } from './FarCity'
import { plainPaths } from './plainPaths'

const patch = (km: number, left: number): PlainPatch =>
  ({ left, right: left + 2, top: 85, bottom: 87, km, built: 1, area: .5 })
const plain = [patch(12, 10), patch(24, 20), patch(35, 30), patch(47, 40)]
const count = (paths: ReturnType<typeof plainPaths>) =>
  paths.reduce((total, { d }) => total + (d.match(/M/g)?.length ?? 0), 0)

it('renders at most three day paths and two night paths with no per-patch or per-light nodes', () => {
  const dense = Array.from({ length: 700 }, (_, i) => patch(5 + i % 40, i / 2))
  for (const night of [false, true]) {
    const bands = plainPaths(dense, [], 17, night, 65)
    const svg = renderToStaticMarkup(createElement('svg', null, createElement(PlainCityPaths, { bands, night })))
    const nodes = svg.match(/<path\b/g)?.length ?? 0
    expect(nodes).toBeGreaterThan(0)
    expect(nodes).toBeLessThanOrEqual(night ? 2 : 3)
    expect(svg).not.toMatch(/<(rect|mask|circle)\b/)
  }
})

it('attenuates and culls the same plain at visibility of 20, 35, and 50 km', () => {
  const day = (v?: number) => plainPaths(plain, [], 17, false, v)
  const night = (v: number) => plainPaths(plain, [], 17, true, v)
  expect([20, 35, 50].map(v => count(day(v)))).toEqual([1, 2, 3])
  expect(day(20)[0].opacity).toBeLessThan(Math.max(...day(50).map(band => band.opacity)))
  expect(day()).toEqual(day(25))
  expect([20, 35, 50].map(v => count(night(v)))).toEqual([15, 20, 20])
})

