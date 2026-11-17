import type { Place } from '../../../config/place'
import { isPlaceHomes, settlementSize } from '../../../data/landmarks/placeMarks'
import { groundFn } from '../../../data/landmarks/seat'
import { composeSettlement, hashId, settlementStyle, type Settlement } from '../../../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../../../data/landmarks/types'
import type { SceneTerrain } from '../../../data/terrain/terrain'
import { BUILDINGS } from './generic/buildingSpecs'
import type { Box } from './markBox'
import { fitMarks, hillBoxes, placeLabel } from './sceneLayout'

interface Input {
  place: Place
  terrain: SceneTerrain
  landmarks: Landmark[]
  placed: PlacedMark[]
  width: number
  litShare: number
  /** The sun-event caption's box, when shown: no house stands under it and the label keeps clear. */
  caption: Box | null
  /** The elevation label's text; below sea level it hangs under the sea line. */
  label: { text: string; below: boolean }
}

/**
 * Ground functions, the marks fitted to what is visible, the place's settlement cluster and the elevation label's
 * spot for the hill layer, in px at the scene's real width.
 */
export function hillScene({ place, terrain, landmarks, placed, width, litShare, caption, label }: Input) {
  const ground = groundFn(terrain.nearPoints, width)
  const farGround = groundFn(terrain.farPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  /** The dot sits on the drawn ridge, not on the raw middle sample (which can float above the smoothed curve). */
  const centerY = place.id === 'shadmot-mehola' ? terrain.centerY : ground(centerX)
  const dot = { x: centerX, y: centerY }
  const marks = fitMarks(placed, ground, width, dot)
  const homes = landmarks.find(isPlaceHomes)
  let settlement: Settlement | null = null
  if (homes) {
    const size = settlementSize(homes)
    settlement = composeSettlement({
      style: settlementStyle(place, size, landmarks), size, width, ground, litShare,
      centerX, centerY, seed: hashId(place.id), keepOut: caption ? [caption] : [],
      absorbed: marks.filter((mark) => mark.absorbed && BUILDINGS[mark.kind])
        .map((mark) => ({ x: mark.xPct / 100 * width, w: BUILDINGS[mark.kind]!.w })),
    })
  }
  const houses = (settlement?.houses ?? []).map((house) => ({ left: house.x - house.w / 2, right: house.x + house.w / 2,
    top: house.baseY - house.h - 1.8, bottom: house.baseY }))
  const labelSpot = placeLabel({
    dot, text: label.text, width,
    top: label.below ? terrain.seaY + 6 : settlement?.labelTop ?? centerY + 7,
    minTop: label.below ? terrain.seaY + 2 : 0,
    obstacles: [...hillBoxes(marks, ground, width), ...houses, ...(caption ? [caption] : [])],
  })
  return { ground, farGround, settlement, centerY, marks, label: labelSpot }
}
