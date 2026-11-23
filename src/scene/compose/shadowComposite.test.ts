import { expect, it } from 'vitest'
import type { ReceiverShadow } from '../model/planeCloudShadow'
import { shadowEdge } from '../model/cloudShadowEdge'
import { ShadowComposite } from './shadowComposite'

it('reuses the mask across cloned descriptors with the same projected footprints and display exposure', () => {
  const cache = new ShadowComposite()
  const rect = { x: 0, y: 0, w: 48, h: 32 }
  const shadow: ReceiverShadow = {
    plane: 'near', open: 0.8, from: 20, speed: 1, beamOverSky: 2, skyDisplay: 0.1, hazeShare: 0.2, hazeY: 0.3,
    blobs: [{ cellId: 'near', centre: [0, 0], x: 12, y: 12, rx: 6, ry: 7, speed: 1, opticalDepth: 3 }],
  }
  const mask = cache.maskAt('plane.near', shadow, rect, 1, 0, 0)
  const { revision } = mask
  expect(mask.alpha.some((alpha) => alpha > 0)).toBe(true)
  const cloned = { ...structuredClone(shadow), hazeY: 0.30000001 }
  expect(cache.maskAt('plane.near', cloned, { ...rect }, 1, 0, 0).revision).toBe(revision)
  cloned.blobs[0].x = 36
  const moved = cache.maskAt('plane.near', { ...cloned }, rect, 1, 0, 0)
  expect(moved.revision).toBeGreaterThan(revision)
  expect(moved.alpha[5 * moved.cols + 5]).toBe(0)
  expect(moved.alpha[5 * moved.cols + 17]).toBeGreaterThan(0)
})

it('adds overlapping cell depth and carries the same lobed mask over a minute boundary', () => {
  const cache = new ShadowComposite()
  const rect = { x: 0, y: 0, w: 128, h: 80 }
  const blob = { cellId: 'moving', centre: [0, 0] as const, x: 35, y: 38, rx: 11, ry: 13,
    opticalDepth: 18, speed: .187, edge: shadowEdge([.12, -.09, .16, -.08], 18, 11, 13, 2, 3) }
  const shadow: ReceiverShadow = { plane: 'near', open: 1, from: 0, speed: blob.speed, beamOverSky: 5,
    skyDisplay: .12, hazeShare: 0, hazeY: .2, neutralBeam: .9, coreDiffuse: .25, blobs: [blob] }
  const before = cache.maskAt('near', shadow, rect, 1, 59.999, 1).alpha.slice()
  const moved = { ...blob, x: blob.x + 60 * blob.speed }
  const next = { ...shadow, from: 60, blobs: [moved] }
  const after = cache.maskAt('near', next, rect, 1, .001, 2).alpha.slice()
  expect(Math.max(...before.map((value, i) => Math.abs(value - after[i])))).toBeLessThanOrEqual(1)
  const one = cache.maskAt('near', next, rect, 1, 0, 3).depth.slice()
  const two = cache.maskAt('near', { ...next, blobs: [moved, moved] }, rect, 1, 0, 4).depth
  expect(Math.max(...one)).toBeGreaterThan(0)
  expect(Math.max(...one.map((value, i) => Math.abs(value * 2 - two[i])))).toBeLessThan(.0001)
})
