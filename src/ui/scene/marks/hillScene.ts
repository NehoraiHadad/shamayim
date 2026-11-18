import type { Place } from '../../../config/place'
import { isPlaceHomes, settlementSize } from '../../../data/landmarks/placeMarks'
import { groundFn } from '../../../data/landmarks/seat'
import { hashId } from '../../../data/landmarks/hash'
import { composeSettlement, settlementReach, settlementStyle, type Settlement, type SettlementStyle } from '../../../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../../../data/landmarks/types'
import type { SceneTerrain } from '../../../data/terrain/terrain'
import { BUILDINGS } from './generic/buildingSpecs'
import { markGeometry } from './markBox'
import { DOT_R, fitMarks, hillBoxes, placeLabel, VISIBLE_BOTTOM } from './sceneLayout'

interface Input {
  place: Place
  terrain: SceneTerrain
  landmarks: Landmark[]
  placed: PlacedMark[]
  width: number
  litShare: number
  /** The elevation label's text; below sea level it hangs under the sea line. */
  label: { text: string; below: boolean }
}

type Ground = (x: number) => number

/**
 * The place's own mosque or tower stands among its houses: when its true x falls down a steep face, below where the
 * houses reach, it slides up toward the crest (across the dot if need be) to the nearest spot inside the town.
 */
function intoTown(marks: PlacedMark[], style: SettlementStyle, ground: Ground, dot: { x: number; y: number }, width: number) {
  const reach = settlementReach(style).down / 2
  return marks.map((mark) => {
    const spec = mark.absorbed ? BUILDINGS[mark.kind] : undefined
    if (!spec) return mark
    /** Its base is level with the lower edge of its footprint (seat.ts). */
    const base = (at: number) => Math.max(ground(at - spec.w / 2), ground(at + spec.w / 2)) - dot.y
    const x = mark.xPct / 100 * width
    if (base(x) <= reach) return mark
    const clear = DOT_R + spec.w / 2 + 1
    const toward = Math.sign(dot.x - x) || 1
    for (let at = x; Math.abs(at - x) <= 80; at += toward * 2) {
      if (Math.abs(at - dot.x) >= clear && base(at) <= reach) return { ...mark, xPct: at / width * 100 }
    }
    return mark
  })
}

/**
 * Ground functions, the marks fitted to what is visible, the place's settlement cluster and the elevation label's
 * spot for the hill layer, in px at the scene's real width.
 */
export function hillScene({ place, terrain, landmarks, placed, width, litShare, label }: Input) {
  const ground = groundFn(terrain.nearPoints, width)
  const farGround = groundFn(terrain.farPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  /** The dot sits on the drawn ridge, not on the raw middle sample (which can float above the smoothed curve). */
  const centerY = terrain.drawn ? terrain.centerY : ground(centerX)
  const dot = { x: centerX, y: centerY }
  const homes = landmarks.find(isPlaceHomes)
  const size = homes && settlementSize(homes)
  const style = size && settlementStyle(place, size, landmarks)
  const marks = fitMarks(style ? intoTown(placed, style, ground, dot, width) : placed, ground, width, dot)
  let settlement: Settlement | null = null
  if (size && style) {
    settlement = composeSettlement({
      style, size, width, ground, litShare, floor: VISIBLE_BOTTOM - 2,
      centerX, centerY, seed: hashId(place.id), keepOut: [],
      absorbed: marks.flatMap((mark) => {
        const x = mark.xPct / 100 * width
        const base = mark.absorbed && BUILDINGS[mark.kind] && markGeometry(mark, x, ground)?.base
        return base ? [{ x, w: BUILDINGS[mark.kind]!.w, base }] : []
      }),
    })
  }
  const houses = (settlement?.houses ?? []).map((house) => ({ left: house.x - house.w / 2, right: house.x + house.w / 2,
    top: house.baseY - house.h - 1.8, bottom: house.baseY }))
  const labelSpot = placeLabel({
    dot, text: label.text, width,
    top: label.below ? terrain.seaY + 6 : settlement?.labelTop ?? centerY + 7,
    minTop: label.below ? terrain.seaY + 2 : 0,
    obstacles: [...hillBoxes(marks, ground, width), ...houses],
  })
  return { ground, farGround, settlement, centerY, marks, label: labelSpot }
}
