import { expect, it } from 'vitest'
import type { ReceiverShadow } from '../model/planeCloudShadow'
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
