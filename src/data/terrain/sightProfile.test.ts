import { expect, it } from 'vitest'
import { anglePx } from './angleScale'
import { apparentAngle, computePanorama, FAR_KM, RAY_DISTANCES } from './panorama'
import { terrainFromPanorama } from './panoramaTerrain'

it('interpolates ground in metres within the near ridge and uses the land angle scale', () => {
  const [first, second] = RAY_DISTANCES
  const terrain = terrainFromPanorama(computePanorama(km => km === second ? 130 : 100, 100))
  const x = 187.5
  const mid = (first + second) / 2
  expect(terrain.seenAt!(x, mid)).toBeNull()
  expect(terrain.groundAt!(x, first)).toBeCloseTo(-2)
  expect(terrain.groundAt!(x, mid)).toBeCloseTo(13)
  expect(terrain.groundAt!(x, second)).toBeCloseTo(28)
  expect(terrain.groundAt!(x, first - .001)).toBeNull()
  expect(terrain.groundAt!(x, FAR_KM)).toBeCloseTo(-2)
  expect(terrain.groundAt!(x, FAR_KM + .001)).toBeNull()
  const angle = apparentAngle(13, mid, 0)
  expect(terrain.angleY!(angle)).toBeCloseTo(terrain.horizonY! - anglePx(angle))
})
