import { describe, expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { computePanorama, type HeightAt } from '../terrain/panorama'
import { terrainFromPanorama } from '../terrain/panoramaTerrain'
import { computeWorld, horizonAngle, viewPanorama } from './world'

/** A true camera (azimuth grows to the right) at any heading, 120° across. */
const turningCamera = (heading: number) => ({ ...SCENE_CAMERA, heading, handed: 1 as const, pxPerDeg: SCENE_CAMERA.width / 120 })

/** A ridge to the east, a lower one to the north, a plain elsewhere. */
const hills: HeightAt = (km, az) => 200 * Math.exp(-(((az - 90) / 25) ** 2)) * Math.min(1, km / 8)
  + 80 * Math.exp(-((Math.min(az, 360 - az) / 20) ** 2)) * Math.min(1, km / 5)

describe('world', () => {
  const world = computeWorld(hills, 0)

  it('holds today\'s south panorama exactly: the view at the scene camera is the same land', () => {
    const south = computePanorama(hills, 0)
    const view = viewPanorama(world, SCENE_CAMERA)
    expect(view.rays.map((ray) => ray.azimuth)).toEqual(south.rays.map((ray) => ray.azimuth))
    expect(view.rays.map((ray) => ray.near)).toEqual(south.rays.map((ray) => ray.near))
    expect(terrainFromPanorama(view).near).toBe(terrainFromPanorama(south).near)
  })

  it('knows the land behind the old view (north), and the same angle from every heading', () => {
    expect(horizonAngle(world, 0)).toBeGreaterThan(horizonAngle(world, 200))
    const east = (heading: number) => {
      const camera = turningCamera(heading)
      const view = viewPanorama(world, camera)
      return view.rays.find((ray) => Math.abs(ray.azimuth - 90) < 1e-6)!.near.angle
    }
    // East is in the middle, at the right edge and at the left edge of these three views.
    expect(east(90)).toBe(east(30))
    expect(east(150)).toBe(east(90))
  })

  it('a true camera facing south has east on the left', () => {
    const t = terrainFromPanorama(viewPanorama(world, turningCamera(180)), { camera: turningCamera(180) })
    const yAt = (x: number) => t.nearPoints.reduce((best, p) => Math.abs(p[0] - x) < Math.abs(best[0] - x) ? p : best)[1]
    // The east ridge stands higher (smaller y) on the left.
    expect(yAt(52.5)).toBeLessThan(yAt(322.5))
  })
})
