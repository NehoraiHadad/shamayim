import { SCENE_CAMERA } from '../domain/camera'
import type { LocalTime } from '../domain/types'
import { skyGeom } from '../scene/model/sky'
import type { SceneBox } from '../scene/model/types'
import { buildField } from '../world/field/field'
import { terrainY } from '../world/terrain'
import type { WorldState } from '../world/types'

/** A broken field under all three layers, the sky it is drawn on and a sheet's plain colours: what the sheet's tests share. */
export const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
export const neutral = { body: [0.5, 0.5, 0.5], shade: [0.3, 0.3, 0.3], lit: [1, 1, 1], light: 0.7 } as const
export const percentile = (values: number[], p: number) =>
  values.length ? values.sort((a, b) => a - b)[Math.ceil(p * values.length) - 1] : 0

export function fieldAt(placeId: string, at: LocalTime) {
  return buildField({
    placeId, at, hours: [], covers: { low: 0.74, mid: 0.63, high: 0.81 },
    lowBaseKm: 1.1, elevationKm: 0.05, weatherCode: 3,
    sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
  })
}

export function frame(placeId: string, at: LocalTime) {
  const field = fieldAt(placeId, at)
  const world = {
    place: { id: placeId }, relief: { y: (angle: number) => terrainY(128, angle) }, camera: SCENE_CAMERA,
    bodies: { sun: { azimuth: 180 } }, cloudField: { field },
  } as WorldState
  return { world, field, geom: skyGeom(world, box) }
}
