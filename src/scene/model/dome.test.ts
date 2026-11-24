import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { domeOf } from './dome'
import { skyGeom } from './sky'
import type { SceneBox } from './types'

const boxes: SceneBox[] = [
  { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 },
  { width: 1280, skyHeight: 600, landTop: 420, landHeight: 180, dpr: 1 },
]

it.each(boxes)('leaves the relief with no kink, rises to the zenith and reads back, at $width px', (box) => {
  const world = { camera: SCENE_CAMERA, relief: { y: (altitude: number) => terrainY(box.landHeight, altitude) } } as WorldState
  const { dome, domeAltitudeAt } = skyGeom(world, box)
  const slope = (from: number, to: number) => (dome(from) - dome(to)) / (to - from)
  // A kink there draws the bottom of a cloud across it as a flat ledge under a stretched body.
  for (const step of [0.1, 0.5, 1]) expect(slope(22, 22 + step) / slope(22 - step, 22)).toBeLessThan(1.15)
  for (let altitude = 0; altitude < 90; altitude += 0.5) {
    expect(slope(altitude, altitude + 0.5)).toBeGreaterThan(0)
    expect(domeAltitudeAt(dome(altitude))).toBeCloseTo(altitude, 8)
  }
  for (let altitude = -40; altitude < 0; altitude++) expect(domeAltitudeAt(dome(altitude))).toBeCloseTo(altitude, 6)
  expect(dome(90)).toBeCloseTo(18, 8)
})

it('keeps rising over a relief that is steep at the join', () => {
  for (const perDeg of [6, 8, 10, 12]) {
    const { dome } = domeOf((altitude) => 300 - perDeg * altitude)
    for (let altitude = 22; altitude < 90; altitude += 0.25) expect(dome(altitude)).toBeGreaterThan(dome(altitude + 0.25))
  }
})
