import type { Place } from '../../../config/place'
import { placeCityTowers, towerBox, type PlacedTower } from '../../../data/city/cityTowers'
import { composeCity } from '../../../data/city/fabric'
import { composeNeighbours, neighbourBox } from '../../../data/city/neighbours'
import { skylineData, type SkylineData } from '../../../data/city/skylineData'
import { inSkylineReach } from '../../../data/city/skylineRay'
import { sameTower, splitSkylineTowers } from '../../../data/city/skylineTowers'
import { isGenericHighrise, placeMarks } from '../../../data/landmarks/placeMarks'
import { distanceOf } from '../../../data/landmarks/project'
import { groundFn } from '../../../data/landmarks/seat'
import { hashId } from '../../../data/landmarks/hash'
import { composeSettlement, desertSettlement, settlementReach, type Settlement, type SettlementStyle } from '../../../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../../../data/landmarks/types'
import type { SceneTerrain } from '../../../data/terrain/terrain'
import { stageSettlement } from './stageScene'
import { eyeHouses, groundYAt, TRUE_DOT_Y, trueScene } from '../../../dev/trueScene'
import { SCENE_CAMERA } from '../../../domain/camera'
import { BUILDINGS } from './generic/buildingSpecs'
import { homeMode, neighbourHomeZone, type HomeCityData } from './homeMode'
import { markGeometry } from './markBox'
import { plainLabels } from './plainLabels'
import { DOT_R, fitMarks, hillBoxes, placeLabel, SHEET_CLEAR, VISIBLE_BOTTOM } from './sceneLayout'

interface Input {
  place: Place
  terrain: SceneTerrain
  landmarks: Landmark[]
  placed?: PlacedMark[]
  width: number
  litShare: number
  city?: HomeCityData | null
  skyline?: SkylineData | null
  showSea?: boolean
  /** The elevation label's text; below sea level it hangs under the sea line. */
  label: { text: string; below: boolean }
  /** False for a backdrop sector of a turning view: the place's own homes belong to the stage (`stageScene`). */
  withHome?: boolean
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
export function hillScene({ place, terrain, landmarks: given, placed, width, litShare, label, city, withHome = true,
  skyline: givenSkyline = skylineData(place, width, city?.raster, terrain, city?.towers), showSea = terrain.seaInView }: Input) {
  // Prototype (`?truescene`): no hand-set positions, no drawn village glyph; the houses come from the raster below.
  const eye = trueScene() && Boolean(terrain.sightAt)
  const landmarks = eye ? given.filter(mark => mark.kind !== 'homes').map(({ x: _x, ...mark }) => mark as Landmark) : given
  const skyline = eye ? null : givenSkyline
  const ground = groundFn(terrain.nearPoints, width)
  const farGround = groundFn(terrain.farPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  /** The dot sits on the drawn ridge, not on the raw middle sample (which can float above the smoothed curve). */
  const centerY = eye ? TRUE_DOT_Y : terrain.stage ? terrain.stage.y : terrain.drawn ? terrain.centerY : ground(centerX)
  // On a stage the place's own houses stand on its ground, seen from the pole; elsewhere on the drawn ridge.
  const homeGround: Ground = terrain.stage ? () => centerY : ground
  const dot = { x: centerX, y: centerY }
  const mode = homeMode(place, landmarks, width, centerX, city, Boolean(terrain.sightAt))
  const cityMode = mode?.kind === 'city'
  const right = terrain.seaSide === 'west' ? width * .06 + 44 : width * (terrain.seaSide === 'east' ? .94 : .73)
  // The time readout is outside the drawing. The in-scene sea label uses the existing city padding.
  const keepOut = showSea ? [{ left: right - 44, right, top: terrain.seaY - 14, bottom: terrain.seaY - 2 }] : []
  const input = mode && { style: mode.style, size: mode.size, width, ground: homeGround, litShare, floor: VISIBLE_BOTTOM - 2,
    centerX, centerY, seed: mode.kind === 'village' ? mode.seed : hashId(place.id),
    keepOut: mode.kind === 'template' ? [] : keepOut }
  // Fit the footprint before placing marks. Absorbed landmarks can cut holes afterward without
  // pulling the surrounding marks into the space reserved by the initial layout.
  const homeHalf = mode?.kind === 'village'
    ? composeSettlement(input!, mode.plan).halfWidth : mode?.homeHalf ?? 7
  const rasterTowers = skyline && (city?.raster?.towers ?? city?.towers)
  const replaced = new Set(rasterTowers ? landmarks.filter(mark => {
    if (mark.source !== 'osm' || !isGenericHighrise(mark.kind, mark.glyph)) return false
    return inSkylineReach(distanceOf(place, mark)) && rasterTowers.some(tower => sameTower(mark, tower))
  }).map(mark => mark.id) : [])
  const projected = placed?.filter(mark => !replaced.has(mark.id)) ?? placeMarks(place,
    { ...terrain, seaInView: showSea }, landmarks.filter(mark => !replaced.has(mark.id)), width,
    terrain.sightAt ? undefined : homeHalf, cityMode)
  // Data towers cover the near band; generic far-ridge marks still use the landmark data.
  const candidates = cityMode ? projected.filter(mark => mark.layer !== 'near' || !isGenericHighrise(mark.kind, mark.glyph)) : projected
  // Mapped houses and their absorbed marks follow the ridge at their projected positions.
  const fitted = fitMarks(mode && (terrain.sightAt || mode.kind !== 'village') ? intoTown(candidates, mode.style, homeGround, dot, width)
    : candidates, ground, width, dot).map(mark => terrain.stage && mark.kind === 'homes'
    ? { ...mark, lift: ground(mark.xPct / 100 * width) - centerY } : mark)
  // On a stage with the built-up map, the place's own buildings come from it (below), not from a homes glyph.
  const stageMap = Boolean(terrain.stage && city?.raster)
  const kept = stageMap || !withHome ? fitted.filter(mark => mark.kind !== 'homes') : fitted
  // Prototype: a mark within 3 km stands on the ground at its own distance, not on the ridge in its direction.
  const byId = new Map(landmarks.map(mark => [mark.id, mark]))
  const marks = !eye ? kept : kept.map(mark => {
    const source = byId.get(mark.id)
    const km = source ? distanceOf(place, source) : Infinity
    if (mark.layer !== 'near' || km > 3) return mark
    const x = mark.xPct / 100 * width
    const y = groundYAt(terrain, mark.xPct / 100 * 375, km)
    return y === null ? mark : { ...mark, lift: ground(x) - y }
  })
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
  // On a stage the place's own buildings come from the built-up map, seen from the pole (`stageVillage.ts`).
  if (!withHome) {
    settlement = null
  } else if (eye) {
    settlement = city?.raster ? { style: mode?.kind === 'city' ? 'blocks' : mode?.style ?? 'tile', contours: [], labelTop: TRUE_DOT_Y - 2,
      halfWidth: 0, houses: eyeHouses(place, city.raster, terrain, terrain.camera ?? SCENE_CAMERA, width) } : null
    cityTowers = []
  } else if (stageMap && terrain.camera && terrain.horizonY !== undefined) {
    settlement = stageSettlement(place, city!.raster!, terrain.camera, terrain.horizonY, width, mode?.style)
    cityTowers = []
  }
  const drawn = skyline && new Set(marks.map(mark => mark.id))
  const curatedTowers = drawn ? landmarks.filter(mark => drawn.has(mark.id) && mark.source === 'curated' &&
    (mark.kind === 'highrise' || (mark.kind === 'custom' && mark.heightM >= 40))) : []
  const skylineTowers = skyline && splitSkylineTowers(skyline.towers, curatedTowers)
  if (skylineTowers) cityTowers = skylineTowers.glyphs
  const houses = (settlement?.houses ?? []).map(house => {
    const { x, w, h, baseY } = house
    return { left: x - w / 2, right: x + w / 2, top: baseY - h - 1.8, bottom: baseY }
  })
  // Cached runs collapse depth to band midpoints and cannot resolve bearings within a run.
  const neighbours = !terrain.sightAt && city?.clusters && !cityMode ? composeNeighbours({
    clusters: city.clusters, columns: city, ground, floor: VISIBLE_BOTTOM - SHEET_CLEAR,
    width, centerX, centerY, litShare, keepOut, desert: desertSettlement(place),
    homeZone: neighbourHomeZone(centerX, mode?.kind === 'village' ? settlement?.halfWidth ?? 0 : mode?.homeHalf ?? 0),
    homeHouses: settlement?.houses,
  }) : []
  const obstacles = [...hillBoxes(marks, ground, width), ...houses, ...cityTowers.map(towerBox), ...neighbours.map(neighbourBox)]
  const labelSpot = placeLabel({
    dot, text: label.text, width,
    top: label.below ? terrain.seaY + 6 : settlement?.labelTop ?? centerY + 7,
    minTop: label.below ? terrain.seaY + 2 : 0,
    obstacles,
  })
  const farBoxes = marks.flatMap(mark => {
    if (mark.layer !== 'far') return []
    const geometry = markGeometry(mark, mark.xPct / 100 * width, farGround, true)
    return geometry ? [geometry.box] : []
  })
  const labels = terrain.seenAt ? plainLabels(marks, landmarks, width, ground, dot, labelSpot, label.text,
    [...obstacles, ...keepOut, ...farBoxes]) : []
  const citySkyline = skyline && skylineTowers && {
    data: skyline, slabs: skylineTowers.slabs, centerX, homeHalf, seed: hashId(place.id),
  }
  return { ground, farGround, settlement, cityTowers, citySkyline, neighbours, centerY, marks, label: labelSpot, labels }
}
