import type { Place } from '../../../config/place'
import type { CityRaster } from '../../../data/city/cityRaster'
import type { Settlement, SettlementStyle } from '../../../data/landmarks/settlement'
import type { Landmark } from '../../../data/landmarks/types'
import type { Stage } from '../../../data/world/stage'
import { stageHouses } from '../../../data/world/stageVillage'
import type { Camera } from '../../../domain/camera'
import { homeMode } from './homeMode'
import { placeLabel } from './sceneLayout'

/** The place's own buildings on the stage, in px at the scene's real width (the projection works in scene units). */
export function stageSettlement(place: Place, raster: CityRaster, camera: Camera, horizonY: number, width: number,
  style: SettlementStyle = 'tile'): Settlement {
  const { houses, blocks } = stageHouses(place, raster, camera, horizonY)
  const scale = width / camera.width
  return { style: blocks ? 'blocks' : style, contours: [], labelTop: 0, halfWidth: 0,
    houses: houses.map(house => ({ ...house, x: house.x * scale })) }
}

interface Input {
  place: Place
  landmarks: Landmark[]
  raster?: CityRaster
  camera: Camera
  horizonY: number
  stage: Stage
  width: number
  label: { text: string }
}

/**
 * Everything of a turning view that depends on the heading and is not the backdrop: the place's houses from the pole,
 * the dot and the elevation label. Light enough to redo every frame of a turn.
 */
export function stageScene({ place, landmarks, raster, camera, horizonY, stage, width, label }: Input) {
  const dot = { x: width / 2, y: stage.y }
  const style = homeMode(place, landmarks, width, dot.x, null, true)?.style
  const settlement = raster ? stageSettlement(place, raster, camera, horizonY, width, style) : null
  const obstacles = (settlement?.houses ?? []).map(({ x, w, h, baseY }) => ({ left: x - w / 2, right: x + w / 2, top: baseY - h - 1.8, bottom: baseY }))
  const spot = placeLabel({ dot, text: label.text, width, top: dot.y + 7, minTop: 0, obstacles })
  return { settlement, centerY: dot.y, label: spot }
}
