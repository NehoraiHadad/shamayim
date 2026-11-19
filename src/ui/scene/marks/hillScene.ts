import { beyondPortrait, portraitReach, skylineIsCity } from '../../../data/landmarks/portrait'
import type { Place } from '../../../config/place'
import { placeCityTowers, towerBox, type PlacedTower } from '../../../data/city/cityTowers'
import { composeCity } from '../../../data/city/fabric'
import { composeNeighbours, neighbourBox } from '../../../data/city/neighbours'
import { skylineData, type SkylineData } from '../../../data/city/skylineData'
import { inSkylineReach } from '../../../data/city/skylineRay'
import { sameTower, splitSkylineTowers } from '../../../data/city/skylineTowers'
import { baseYAt, inFrame, outsideFrame, outsideProject, outsideSkyline, skylineVariantFlag,
  type OutsideSkyline, type SkylineVariant } from '../../../data/city/outsideView'
import { isGenericHighrise, placeMarks } from '../../../data/landmarks/placeMarks'
import { distanceOf, offsetKm } from '../../../data/landmarks/project'
import { groundFn } from '../../../data/landmarks/seat'
import { hashId } from '../../../data/landmarks/hash'
import { composeSettlement, desertSettlement, settlementReach, type Settlement, type SettlementStyle } from '../../../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../../../data/landmarks/types'
import { noteBoxes, sceneNotes } from '../../../data/terrain/sceneNotes'
import type { SceneTerrain } from '../../../data/terrain/terrain'
import { seaSpan } from '../../../world/seaLine'
import { BUILDINGS } from './generic/buildingSpecs'
import { homeMode, neighbourHomeZone, type HomeCityData } from './homeMode'
import { isField } from './hillPlane'
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
  /** The sea-level datum is drawn (the place is below sea level): its note is kept clear. */
  datum?: boolean
  /** The elevation label's text; below sea level it hangs under the sea line. */
  label: { text: string; below: boolean }
  /** Design study (`?skyline=a|b|c`, dev only): the place seen from outside (`outsideView.ts`). */
  variant?: SkylineVariant | null
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
/**
 * A city is a portrait like any place (owner, 2026-11-19: the data skyline near it read as noise). `?citytrue` (dev)
 * shows it the old way, drawn true from its built squares, for comparison.
 */
const CITY_TRUE = typeof window !== 'undefined' && Boolean(import.meta.env?.DEV)
  && new URLSearchParams(window.location.search).has('citytrue')

export function hillScene(input: Input) {
  const variant = input.variant === undefined ? skylineVariantFlag() : input.variant
  return variant && input.terrain.sightAt ? outsideScene(input, variant) : trueScene(input)
}

function trueScene({ place, terrain, landmarks, placed, width, litShare, label, city,
  skyline: givenSkyline = skylineData(place, width, city?.raster, terrain, city?.towers), datum = false }: Input) {
  const ground = groundFn(terrain.nearPoints, width)
  const farGround = groundFn(terrain.farPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  /** The dot sits on the drawn ridge, not on the raw middle sample (which can float above the smoothed curve). */
  const centerY = terrain.drawn ? terrain.centerY : ground(centerX)
  const dot = { x: centerX, y: centerY }
  const mode = homeMode(place, landmarks, width, centerX, city, Boolean(terrain.sightAt))
  const cityMode = mode?.kind === 'city'
  // A village is drawn as its portrait round the dot, out to its reach (its built-up area and the fields round it);
  // a city is drawn true, its own houses in the data skyline.
  const reachKm = portraitReach(city?.clusters)
  const isCity = CITY_TRUE && (givenSkyline ? skylineIsCity(givenSkyline, reachKm) : cityMode)
  // The data skyline's faces (built squares at their true angle, on the vertical stretch) read as grey pillars and
  // dashes: only its towers stay. Far towns are drawn by the far city (`FarCity`).
  const skyline = givenSkyline && !isCity ? beyondPortrait(givenSkyline, Infinity) : givenSkyline
  // The time readout is outside the drawing. The notes on the land (the datum, the water's names) are kept clear.
  const notes = sceneNotes(terrain, datum, width, datum ? seaSpan(terrain.nearPoints, terrain.seaY) : undefined)
  const keepOut = noteBoxes(notes)
  const input = mode && { style: mode.style, size: mode.size, width, ground, litShare, floor: VISIBLE_BOTTOM - 2,
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
    terrain, landmarks.filter(mark => !replaced.has(mark.id)), width,
    terrain.sightAt ? undefined : homeHalf, cityMode, isCity ? undefined : { reachKm }, keepOut)
  // Data towers cover the near band; generic far-ridge marks still use the landmark data.
  const candidates = cityMode ? projected.filter(mark => mark.layer !== 'near' || !isGenericHighrise(mark.kind, mark.glyph)) : projected
  // Mapped houses and their absorbed marks follow the ridge at their projected positions.
  const marks = fitMarks(mode && (terrain.sightAt || mode.kind !== 'village') ? intoTown(candidates, mode.style, ground, dot, width)
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
      settlement = mode.kind === 'template' ? { ...composeSettlement(withMarks), mixed: 'mixed' in mode && mode.mixed }
        : composeSettlement(withMarks, mode.plan)
    }
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
  return { ground, farGround, settlement, cityTowers, citySkyline, neighbours, centerY, marks, label: labelSpot, labels, notes,
    outside: null as OutsideSkyline | null }
}

/** What the outside view keeps beyond the place: a far mark needs a name and fame, or to be truly huge (≥ 200 m). */
const HUGE_M = 200

/**
 * The design study's scene (`outsideView.ts`): the same scene, but the place's towers, built squares and portrait marks
 * placed by the one outside view; far marks need a name and fame (or to be huge), a landmark needs a name.
 */
function outsideScene(input: Input, variant: SkylineVariant) {
  const { place, terrain, city, width } = input
  const reachKm = portraitReach(city?.clusters)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  const towers = city?.raster?.towers ?? city?.towers ?? []
  const isCity = input.landmarks.some(mark => mark.source === 'place' && mark.glyph === 'homes-large')
    || towers.filter(tower => distanceOf(place, tower) <= reachKm).length >= 8
  const frame = outsideFrame(city?.clusters, reachKm, centerX, width, isCity)
  const landmarks = input.landmarks.flatMap(mark => {
    if (mark.source === 'place' || mark.source === 'curated') return [mark]
    // A landmark needs a name: an unnamed mark keeps its kind, not its fame.
    const named = mark.nameHe ? mark : { ...mark, fame: undefined }
    const { dx, dy } = offsetKm(place, mark)
    // In the place, or in its portrait's reach (its fields a km beyond it): part of the place.
    if (inFrame(frame, dx, dy, 1) || Math.hypot(dx, dy) <= reachKm + 1) return [named]
    return (named.fame && named.nameHe) || mark.heightM >= HUGE_M ? [named] : []
  })
  const base = trueScene({ ...input, landmarks,
    // The place's own towers are drawn by the outside view; the true skyline keeps what lies beyond the place.
    skyline: input.skyline === undefined ? skylineData(place, width, city?.raster, terrain, city?.towers) : input.skyline })
  const ground = base.ground
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  // Portrait marks: by the outside view, not by side (one rule for everything in the place).
  const marks = base.marks.map(mark => {
    const source = landmarks.find(item => item.id === mark.id)
    if (!source || !mark.portrait) return mark
    const { dx, dy } = offsetKm(place, source)
    const at = outsideProject(frame, dx, dy)
    const scale = Math.max(.75, Math.min(1.3, at.k / frame.k))
    const tall = source.heightM >= 40 && (source.kind === 'custom' || source.kind === 'highrise')
    const hPx = tall && isCity ? Math.round(source.heightM * at.k) : Math.round(mark.hPx * scale)
    // Clear of the dot, on its own side.
    const clear = DOT_R + 5
    const x = Math.abs(at.x - centerX) >= clear ? at.x : centerX + (dx > 0 ? -clear : clear)
    return { ...mark, xPct: x / width * 100, hPx, baseY: baseYAt(ground, x, at.near, floor) }
  }).filter((mark, i, all) => !mark.portrait || mark.absorbed || isField(mark) || all.every((other, j) => j >= i
    || !other.portrait || isField(other) || Math.abs(other.xPct - mark.xPct) / 100 * width >= 6))
  if (!isCity) return { ...base, marks, outside: null }
  // A city's own high-rises are its towers (`outsideSkyline`, which takes their names and fame): not marks too.
  const own = marks.filter(mark => !(mark.portrait && isGenericHighrise(mark.kind, mark.glyph)))
  const outside = outsideSkyline({ variant, place, towers, landmarks, raster: city?.raster ?? undefined, frame,
    ground, floor, width })
  // Beyond the place the skyline stays true: its towers outside the frame keep their true bearing (slabs).
  const beyond = base.citySkyline?.data.towers.filter(tower => {
    const { dx, dy } = offsetKm(place, tower.location)
    return !inFrame(frame, dx, dy)
  }) ?? []
  const citySkyline = base.citySkyline && { ...base.citySkyline, slabs: beyond }
  // The elevation label keeps clear of the towers and marks (the low fabric round the dot may lie under it).
  const dot = { x: centerX, y: base.centerY }
  const label = placeLabel({ dot, text: input.label.text, width,
    top: input.label.below ? terrain.seaY + 6 : base.centerY + 7, minTop: input.label.below ? terrain.seaY + 2 : 0,
    obstacles: [...hillBoxes(own, ground, width), ...outside.towers.map(tower => ({ left: tower.x - tower.w / 2,
      right: tower.x + tower.w / 2, top: tower.baseY - tower.h, bottom: tower.baseY }))] })
  // The place's own blocks are its built squares in the outside view: the composed blocks round the dot go.
  return { ...base, marks: own, cityTowers: [], citySkyline, settlement: null, outside, label }
}
