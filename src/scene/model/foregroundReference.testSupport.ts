import { azimuthAt } from '../../domain/camera'
import { foregroundOf } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import type { RGB, WorldState } from '../../world/types'
import { materialAt } from '../paint/shared/land/planeMaterial'
import { samplePlaneTexel, shadeTexelSrgb, type PlaneTexelCtx } from '../paint/shared/land/planeTexel'
import { foregroundProfile, foregroundShare, groundSightSlope, projectedRange } from './foregroundMaterial'
import { ALBEDO_CHROMA_BOOST, albedoLinear, srgbRgbToLinear } from './landRadiance'
import { planeGeomOf } from './planeGeometry'

/** Reference quadrature on the native, unfiltered cell footprints at visible screen positions. */
export function nativeForeground(world: WorldState, t: PlaneTexelCtx, landHeight: number) {
  const field = foregroundOf(world.land)!
  const geom = planeGeomOf(world, 'near', world.terrain.near, landHeight)
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  const mix = (a: number, b: number, n: number) => a + (b - a) * n
  return (i: number, x: number, y: number): RGB => {
    const u = clamp((x - t.bounds.x) / t.bounds.w)
    const v = clamp((y - t.crestY[i]) / Math.max(1, t.footY[i] - t.crestY[i]))
    const rgb = materialAt(t, x, y, u, v)
    const gx = u * (geom.cols - 1), gy = v * (geom.rows - 1)
    const ix = Math.min(geom.cols - 2, Math.floor(gx)), iy = Math.min(geom.rows - 2, Math.floor(gy))
    const k = iy * geom.cols + ix
    const km = mix(mix(geom.km[k], geom.km[k + 1], gx - ix),
      mix(geom.km[k + geom.cols], geom.km[k + geom.cols + 1], gx - ix), gy - iy)
    let share = foregroundShare(km)
    if (share > 0) {
      const bearing = azimuthAt(u, world.camera) * Math.PI / 180
      const east = Math.sin(bearing), north = Math.cos(bearing)
      const profile = foregroundProfile(world, u * SCENE_W, east, north)
      const metres = 1000 * projectedRange(profile, groundSightSlope(world.terrain.horizonY, y), km)
      share = Math.min(share, foregroundShare(metres / 1000))
      const col = Math.round((metres * east - field.east0) / field.eastStep)
      const row = Math.round((metres * north - field.north0) / field.northStep)
      const j = (row * field.cols + col) * 4
      if (col >= 0 && col < field.cols && row >= 0 && j < field.rgba.length) {
        field.read?.(row, col)
        if (field.rgba[j + 3]) {
          const native = albedoLinear([field.rgba[j] / 255, field.rgba[j + 1] / 255, field.rgba[j + 2] / 255], ALBEDO_CHROMA_BOOST)
          for (let c = 0; c < 3; c++) rgb[c] = mix(rgb[c], native[c], share)
        }
      }
    }
    return shadeTexelSrgb(t, samplePlaneTexel(t, i, x, y, rgb))
  }
}

/** Equal-area screen texels averaged as linear light, then expressed in CIE 1976 Lab. */
export function meanLab(rows: RGB[][]) {
  const pixels = rows.flat()
  const lin: [number, number, number] = [0, 0, 0]
  for (const pixel of pixels) {
    const rgb = srgbRgbToLinear(pixel)
    for (let i = 0; i < 3; i++) lin[i] += rgb[i] / pixels.length
  }
  // Linear sRGB to CIE XYZ with the D65 reference white.
  const xyz = [[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]]
  const white = [0.95047, 1, 1.08883]
  const d = 6 / 29
  const [x, y, z] = xyz.map((row, i) => {
    const t = row.reduce((sum, v, c) => sum + v * lin[c], 0) / white[i]
    return t > d ** 3 ? Math.cbrt(t) : t / (3 * d ** 2) + 4 / 29
  })
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
