import type { Place } from '../../../config/place'
import { isPlaceHomes, settlementSize } from '../../../data/landmarks/placeMarks'
import { groundFn } from '../../../data/landmarks/seat'
import { composeSettlement, hashId, settlementStyle, type Settlement } from '../../../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../../../data/landmarks/types'
import type { SceneTerrain } from '../../../data/terrain/terrain'
import { BUILDINGS } from './generic/buildingSpecs'

/** Ground function and the place's settlement cluster for the hill layer, in px at the scene's real width. */
export function hillScene(place: Place, terrain: SceneTerrain, landmarks: Landmark[], placed: PlacedMark[], width: number,
  litShare: number) {
  const ground = groundFn(terrain.nearPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  /** The dot sits on the drawn ridge, not on the raw middle sample (which can float above the smoothed curve). */
  const centerY = place.id === 'shadmot-mehola' ? terrain.centerY : ground(centerX)
  const homes = landmarks.find(isPlaceHomes)
  let settlement: Settlement | null = null
  if (homes) {
    const size = settlementSize(homes)
    settlement = composeSettlement({
      style: settlementStyle(place, size, landmarks), size, width, ground, litShare,
      centerX, centerY, seed: hashId(place.id),
      absorbed: placed.filter((mark) => mark.absorbed && BUILDINGS[mark.kind])
        .map((mark) => ({ x: mark.xPct / 100 * width, w: BUILDINGS[mark.kind]!.w })),
    })
  }
  return { ground, settlement, centerY }
}
