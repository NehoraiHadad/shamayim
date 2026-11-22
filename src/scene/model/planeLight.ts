//# allFunctionsCalledOnLoad
import type { Plane, WorldState } from '../../world/types'
import type { PlaneName } from './faceProjection'
import { byteKey, layerKey } from './keys'
import { skyView } from './landIrradiance'
import { dirAtBearing, landIrradiance, srgbRgbToLinear } from './landRadiance'
import { snowMaskOf } from './landSnow'
import { hazeAlong, hazeAt, hazeOf } from './landVeil'
import { planeGeomOf } from './planeGeometry'
import { terrainVisibility } from './terrainVisibility'
import type { PlaneLight, SceneBox } from './types'
import type { LightDir, Normal } from '../../world/livingLight'

const byte = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255)
const incidence = (n: Normal, s: LightDir) => n[0] * s.across + n[1] * s.ahead + n[2] * s.up

/** Pack local incidence, DEM visibility, sky view and face-distance haze for the Worker. */
export function planeLight(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane): PlaneLight {
  const geom = planeGeomOf(world, name, plane, box.landHeight)
  const { cols, rows, xs, bearing, nx, ny, nz, km } = geom
  const irr = landIrradiance(world)
  const hasSun = irr.eSunPi > 1e-5, hasMoon = irr.eMoonPi > 1e-5
  // A beam below 1/150 of diffuse gives less than one display byte of cast-light contrast.
  const sunVisible = irr.eSunPi > irr.eSkyPi / 150 ? terrainVisibility(world.flightTerrain, geom, irr.sunAz, irr.sunAlt, irr.sunDir) : undefined
  const moonVisible = irr.eMoonPi > irr.eSkyPi / 150 && terrainVisibility(world.flightTerrain, geom, irr.moonAz, irr.moonAlt, irr.moonDir)
  const grid = new Uint8Array(cols * rows * 4)
  const columns = Array.from(xs)
  const hazeRows = Array.from({ length: rows }, (_, r) =>
    hazeAlong(columns, Array.from({ length: cols }, (_, c) => hazeAt(world, km[r * cols + c]))))
  for (let c = 0; c < cols; c++) {
    const s = hasSun || irr.skyBias ? dirAtBearing(irr.sunAz, irr.sunAlt, bearing[c], world.camera.handed) : irr.sunDir
    const m = hasMoon ? dirAtBearing(irr.moonAz, irr.moonAlt, bearing[c], world.camera.handed) : irr.moonDir
    for (let r = 0; r < rows; r++) {
      const i = r * cols + c
      const n: Normal = [nx[i], ny[i], nz[i]]
      const sun = hasSun ? incidence(n, s) : 0
      const moon = hasMoon ? incidence(n, m) : 0
      grid[i * 4] = byte(sun > 0 ? sun * (sunVisible?.(i) ?? 1) : 0)
      grid[i * 4 + 1] = byte(moon > 0 ? moon * (moonVisible ? moonVisible(i) : 1) : 0)
      grid[i * 4 + 2] = byte(skyView(n, s, irr.skyBias))
      grid[i * 4 + 3] = byte(hazeRows[r][c])
    }
  }
  const snow = snowMaskOf(world, box, name)
  const hazeLin = srgbRgbToLinear(hazeOf(world))
  const snowSeam = name === 'near' && snow && world.terrain.far.points.length > 1 ? snow.cover : 0
  const key = layerKey('plane.light', geom.geomKey, byteKey(grid),
    JSON.stringify([irr.eSunVec, irr.eMoonVec, irr.eSkyVec, hazeLin, irr.yHorizon, snow, snowSeam]))
  return {
    key, blend: 'source-over',
    litField: {
      cols, rows, grid, eSun: irr.eSunVec, eMoon: irr.eMoonVec, eSky: irr.eSkyVec,
      hazeLin, yHorizon: irr.yHorizon, snow, snowSeam,
    },
  }
}
