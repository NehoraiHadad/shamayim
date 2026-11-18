import type { Place } from '../../../config/place'
import { placeCityTowers, towerBox, type PlacedTower } from '../../../data/city/cityTowers'
import { composeCity } from '../../../data/city/fabric'
import { isGenericHighrise, placeMarks } from '../../../data/landmarks/placeMarks'
import { groundFn } from '../../../data/landmarks/seat'
import { hashId } from '../../../data/landmarks/hash'
import { composeSettlement, settlementReach, type Settlement, type SettlementStyle } from '../../../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../../../data/landmarks/types'
import type { SceneTerrain } from '../../../data/terrain/terrain'
import { BUILDINGS } from './generic/buildingSpecs'
import { homeMode, type HomeCityData } from './homeMode'
import { markGeometry } from './markBox'
import { DOT_R, fitMarks, hillBoxes, placeLabel, VISIBLE_BOTTOM } from './sceneLayout'

interface Input {
  place: Place
  terrain: SceneTerrain
  landmarks: Landmark[]
  placed?: PlacedMark[]
  width: number
  litShare: number
  city?: HomeCityData | null
  showSea?: boolean
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
export function hillScene({ place, terrain, landmarks, placed, width, litShare, label, city, showSea = terrain.seaInView }: Input) {
  const ground = groundFn(terrain.nearPoints, width)
  const farGround = groundFn(terrain.farPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  /** The dot sits on the drawn ridge, not on the raw middle sample (which can float above the smoothed curve). */
  const centerY = place.id === 'shadmot-mehola' ? terrain.centerY : ground(centerX)
  const dot = { x: centerX, y: centerY }
  const mode = homeMode(place, landmarks, width, centerX, city)
  const cityMode = mode?.kind === 'city'
  const right = terrain.seaSide === 'west' ? width * .06 + 44 : width * (terrain.seaSide === 'east' ? .94 : .73)
  // The time readout is outside the drawing. The in-scene sea label uses the existing city padding.
  const keepOut = showSea ? [{ left: right - 44, right, top: terrain.seaY - 14, bottom: terrain.seaY - 2 }] : []
  const input = mode && { style: mode.style, size: mode.size, width, ground, litShare, floor: VISIBLE_BOTTOM - 2,
    centerX, centerY, seed: mode.kind === 'village' ? mode.seed : hashId(place.id),
    keepOut: mode.kind === 'template' ? [] : keepOut }
  // Fit the footprint before placing marks. Absorbed landmarks can cut holes afterward without
  // pulling the surrounding marks into the space reserved by the initial layout.
  const homeHalf = mode?.kind === 'village'
    ? composeSettlement(input!, mode.plan).halfWidth : mode?.homeHalf ?? 7
  const projected = placed ?? placeMarks(place, { ...terrain, seaInView: showSea }, landmarks, width, homeHalf, cityMode)
  // Data towers cover the near band; generic far-ridge marks still use the landmark data.
  const candidates = cityMode ? projected.filter(mark => mark.layer === 'far' || !isGenericHighrise(mark.kind, mark.glyph)) : projected
  // Mapped houses and their absorbed marks follow the ridge at their projected positions.
  const marks = fitMarks(mode && mode.kind !== 'village' ? intoTown(candidates, mode.style, ground, dot, width)
    : candidates, ground, width, dot)
  let cityTowers: PlacedTower[] = []
  let settlement: Settlement | null = null
  if (mode && input) {
    const withMarks = {
      ...input,
      absorbed: marks.flatMap((mark) => {
        const x = mark.xPct / 100 * width
        const base = mark.absorbed && BUILDINGS[mark.kind] && markGeometry(mark, x, ground)?.base
        return base ? [{ x, w: BUILDINGS[mark.kind]!.w, base, kind: mark.kind }] : []
      }),
    }
    if (mode.kind === 'city') {
      settlement = composeCity({ ...withMarks, columns: mode.columns })
      const curated = landmarks.filter(mark => mark.source === 'curated' && mark.glyph && BUILDINGS[mark.glyph])
      cityTowers = placeCityTowers({ ...withMarks, towers: mode.columns.towers, curated })
    } else {
      settlement = mode.kind === 'template' ? composeSettlement(withMarks) : composeSettlement(withMarks, mode.plan)
    }
  }
  const houses = (settlement?.houses ?? []).map(house => {
    const { x, w, h, baseY } = house
    return { left: x - w / 2, right: x + w / 2, top: baseY - h - 1.8, bottom: baseY }
  })
  const labelSpot = placeLabel({
    dot, text: label.text, width,
    top: label.below ? terrain.seaY + 6 : settlement?.labelTop ?? centerY + 7,
    minTop: label.below ? terrain.seaY + 2 : 0,
    obstacles: [...hillBoxes(marks, ground, width), ...houses, ...cityTowers.map(towerBox)],
  })
  return { ground, farGround, settlement, cityTowers, centerY, marks, label: labelSpot }
}
