import { describe, expect, it } from 'vitest'
import { edgePointer } from './edgePointer'

const W = 375
const H = 400
const inset = { x: 60, y: 20 }
const centre = { x: 200, y: 200 }
const far = 2000

describe('off-screen pointer', () => {
  it('is not needed when the rain is in view', () => {
    expect(edgePointer(centre, { x: 300, y: 100 }, W, H, inset)).toBeNull()
  })

  it.each([
    ['north', 0, -1, { y: 20 }, -90],
    ['south', 0, 1, { y: 380 }, 90],
    ['east', 1, 0, { x: 315 }, 0],
    ['west', -1, 0, { x: 60 }, 180],
  ] as const)('sits on the %s edge for rain that way', (_, ux, uy, edge, angle) => {
    const p = edgePointer(centre, { x: centre.x + ux * far, y: centre.y + uy * far }, W, H, inset)!
    expect(p).toMatchObject(edge)
    expect(p.angle).toBeCloseTo(angle)
  })

  it.each([
    ['north-east', 1, -1], ['south-east', 1, 1], ['south-west', -1, 1], ['north-west', -1, -1],
  ] as const)('stays inside the inset box on the %s diagonal', (_, ux, uy) => {
    const p = edgePointer(centre, { x: centre.x + ux * far, y: centre.y + uy * far }, W, H, inset)!
    expect(p.x).toBeGreaterThanOrEqual(inset.x - 1e-9)
    expect(p.x).toBeLessThanOrEqual(W - inset.x + 1e-9)
    expect(p.y).toBeGreaterThanOrEqual(inset.y - 1e-9)
    expect(p.y).toBeLessThanOrEqual(H - inset.y + 1e-9)
    // On the ray from the centre.
    expect(Math.abs((p.x - centre.x) * uy - (p.y - centre.y) * ux)).toBeLessThan(1e-6)
  })
})
