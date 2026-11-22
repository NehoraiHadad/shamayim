import { expect } from 'vitest'
import { cellsAround, midnightCells } from './cells'
import { buildField } from './field'
import { smoothstep } from './genus'
import { HALF_WINDOW } from './handover'
import { LATTICES, maxRadius } from './lattice'
import type { FieldInput } from './types'

export function scrubMidnight(input: FieldInput, timestamp: (minute: number) => string) {
  for (const midnight of [1440, 2880]) {
    const fieldAt = (minute: number) => buildField({ ...input, at: timestamp(midnight + minute), weatherForced: true })
    const weight = (minute: number) => smoothstep(-HALF_WINDOW, HALF_WINDOW, minute)
    const atMidnight = fieldAt(0)
    for (const reference of atMidnight.layers) {
      const { lattice, cover, Q, g } = reference
      if (!Q) continue
      const radius = { low: 8, tower: 16, mid: 24, high: 70 }[lattice]
      const { pairs } = midnightCells(atMidnight, reference, 0, 0, radius, atMidnight.t, atMidnight.t)
      const maxShift = 2 * maxRadius(lattice) * g
      const shareSlope = 1.5 / (lattice === 'tower' ? 0.4 : 0.25)
      const rankSlope = -Math.log1p(-Math.min(0.98, cover)) / Math.min(0.98, cover)
      const rankDrift = 0.15 * Math.sin(Math.PI / LATTICES[lattice].period[0])
      let before = fieldAt(-60)
      let old = cellsAround(before, lattice, 0, 0, radius)
      for (let minute = -59; minute <= 60; minute++) {
        const after = fieldAt(minute)
        const current = cellsAround(after, lattice, 0, 0, radius)
        const oldLayer = before.layers.find(layer => layer.lattice === lattice)!
        const layer = after.layers.find(item => item.lattice === lattice)!
        const dw = weight(minute) - weight(minute - 1)
        const dx = (oldLayer.vel[0] + layer.vel[0]) / 2
        const dy = (oldLayer.vel[1] + layer.vel[1]) / 2
        const moveBound = maxShift * dw + 0.001
        const shareBound = shareSlope * (rankDrift + Q * rankSlope * dw) + dw + 1e-12
        // At the end of the morph, the continuation is the incoming site's ordinary id.
        const byId = new Map(old.map(cell => [minute === HALF_WINDOW ? pairs.get(cell.id) ?? cell.id : cell.id, cell]))
        const seen = new Set(current.map(cell => cell.id))
        for (const cell of current) {
          const prev = byId.get(cell.id)
          if (prev) {
            expect(Math.hypot(cell.x - prev.x - dx, cell.y - prev.y - dy), `${lattice} ${minute}`).toBeLessThanOrEqual(moveBound)
            expect(Math.abs(cell.share - prev.share), `${lattice} ${minute}`).toBeLessThanOrEqual(shareBound)
          } else if (Math.hypot(cell.x - dx, cell.y - dy) < radius - moveBound) {
            expect(cell.share, `${lattice} ${minute}`).toBeLessThanOrEqual(shareBound)
          }
        }
        for (const [id, cell] of byId) if (!seen.has(id) && Math.hypot(cell.x + dx, cell.y + dy) < radius - moveBound) {
          expect(cell.share, `${lattice} ${minute}`).toBeLessThanOrEqual(shareBound)
        }
        before = after
        old = current
      }
    }
  }
}
