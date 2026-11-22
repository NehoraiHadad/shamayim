import { expect } from 'vitest'
import { midnightCells, RANGES } from './cells'
import { densityGrid, footprintDistance } from './density'
import { buildField } from './field'
import { LATTICES, maxRadius } from './lattice'
import type { FieldInput } from './types'

export function measureMidnight(input: FieldInput, timestamp: (minute: number) => string) {
  const at = (minute: number) => buildField({ ...input, at: timestamp(minute) })
  const points = Array.from({ length: 41 ** 2 }, (_, i) => [(i % 41 - 20) * 0.3, (Math.floor(i / 41) - 20) * 0.3])
  const samples = (minute: number) => {
    const field = at(minute)
    const grids = field.layers.map(({ lattice }) => densityGrid(field, lattice, 0, 0, RANGES[lattice][0]))
    return points.map(([x, y]) => grids.reduce((sum, grid) => sum + grid.tauAt(x, y), 0))
  }
  const change = (first: number, last: number) => {
    const a = samples(first)
    return samples(last).reduce((sum, value, i) => sum + Math.abs(value - a[i]), 0) / a.length
  }
  const paired: Record<string, string> = {}
  const cover: Record<string, number[]> = {}
  for (const minute of [1425, 1440, 1455]) {
    const field = at(minute)
    const midnight = at(1440).t
    for (const layer of field.layers) {
      const { lattice, g } = layer
      if (!layer.Q) {
        paired[lattice] = '0/0'
        cover[lattice] = [0, 0, 0]
        continue
      }
      const span = 24 * LATTICES[lattice].pitch
      const { cells, incoming, pairs } = midnightCells(field, layer, 0, 0, Math.SQRT2 * span + maxRadius(lattice) * g, field.t, midnight)
      let hits = 0
      const steps = 151
      const isInside = ({ x, y }: { x: number; y: number }) => Math.abs(x) <= span && Math.abs(y) <= span
      if (minute === 1440) {
        const matched = new Set(pairs.values())
        const local = incoming.filter(isInside)
        paired[lattice] = `${local.filter(cell => matched.has(cell.id)).length}/${local.length}`
      }
      const bins: typeof cells[] = Array.from({ length: steps }, () => [])
      const index = (value: number) => (value / span + 1) * (steps - 1) / 2
      for (const cell of cells) {
        for (let j = Math.max(0, Math.ceil(index(cell.y - cell.r))); j <= Math.min(steps - 1, Math.floor(index(cell.y + cell.r))); j++) bins[j].push(cell)
      }
      for (let j = 0; j < steps; j++) for (let i = 0; i < steps; i++) {
        const x = (2 * i / (steps - 1) - 1) * span, y = (2 * j / (steps - 1) - 1) * span
        if (layer.cover >= 0.98 || bins[j].some(cell => Math.abs(x - cell.x) < cell.r && footprintDistance(cell, x, y) < 1)) hits++
      }
      ;(cover[lattice] ??= []).push(hits / steps ** 2)
    }
  }
  const handover = change(1430, 1450), steady = change(1310, 1330)
  console.info('midnight metrics', JSON.stringify({ target: input.covers, paired, cover, handover, steady }))
  expect(handover).toBeLessThanOrEqual(steady)
  for (const { lattice, cover: target } of at(1440).layers) {
    for (const measured of cover[lattice]) expect(Math.abs(measured - target), lattice).toBeLessThanOrEqual(0.03)
  }
}
