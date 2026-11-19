import type { Place } from '../../config/place'
import type { SceneTerrain } from '../terrain/terrain'
import { projectMark } from './markProjection'
import { groundY, markHeight, markWidth } from './project'
import { avoid, score, select, spread, type Candidate } from './rank'
import type { SettlementSize } from './settlement'
import { templateHalf } from './settlementPlan'
import type { Landmark, PlacedMark } from './types'

export const isGenericHighrise = (kind: Landmark['kind'], glyph?: string) =>
  kind === 'highrise' && (glyph === undefined || glyph === 'highrise')

const FIXED: Partial<Record<Landmark['kind'], number>> = { solar: 3, orchard: 6, palms: 11 }
const LIGHTS = new Set<Landmark['kind']>(['highrise', 'homes', 'church', 'minaret', 'lighthouse'])
const LIT_CUSTOM = new Set(['jerusalem-david', 'jerusalem-wall', 'tel-aviv-shalom',
  'tel-aviv-sarona', 'tel-aviv-azrieli', 'haifa-bab', 'haifa-dagon', 'haifa-sail', 'shadmot-homes'])
/** Towers too: a city's high-rises rise out of its blocks instead of standing alone beside an empty hill. */
const ABSORB = new Set<Landmark['kind']>(['synagogue', 'waterTower', 'minaret', 'church', 'silo'])
const SETTLEMENTS = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'isolated_dwelling', 'locality'])

export function placeHomes(place: Place): Landmark[] {
  if (!place.featureCode?.startsWith('PPL') && !(place.usesOsm && SETTLEMENTS.has(place.settlementType ?? ''))) return []
  const size = place.population != null
    ? place.population < 2_000 ? 'small' : place.population < 50_000 ? 'medium' : 'large'
    : place.settlementType === 'city' || place.featureCode === 'PPLA' ? 'large'
      : place.settlementType === 'town' || place.featureCode === 'PPLX' ? 'medium' : 'small'
  const heightM = size === 'small' ? 6 : size === 'medium' ? 8 : 14
  return [{ id: `${place.id}-homes`, kind: 'homes', glyph: `homes-${size}`, nameHe: place.nameHe,
    lat: place.lat, lon: place.lon, heightM, source: 'place' }]
}

/** Adds the place's own houses, unless a curated set already draws them (Shadmot's homes glyph). */
export function withPlaceHomes(place: Place, marks: Landmark[], curated = false): Landmark[] {
  const ownHomes = curated && marks.some((mark) => mark.glyph?.endsWith('-homes'))
  return ownHomes ? marks : [...marks, ...placeHomes(place)]
}

export function isPlaceHomes(mark: Landmark) { return mark.kind === 'homes' && mark.source === 'place' }

export function settlementSize(homes: Landmark): SettlementSize {
  return homes.glyph === 'homes-large' ? 'large' : homes.glyph === 'homes-medium' ? 'medium' : 'small'
}

function elevationAt(values: number[] | undefined, x: number): number | undefined {
  if (!values?.length) return undefined
  const position = Math.max(0, Math.min(values.length - 1, x / 375 * (values.length - 1)))
  const left = Math.floor(position)
  const t = position - left
  return values[left] + ((values[left + 1] ?? values[left]) - values[left]) * t
}

function legacyHomeHalf(marks: Landmark[]) {
  const homes = marks.find(isPlaceHomes)
  return homes ? templateHalf(settlementSize(homes)) : 7
}

export function placeMarks(place: Place, terrain: SceneTerrain, marks: Landmark[], width: number,
  homeHalf = legacyHomeHalf(marks), cityMode = false): PlacedMark[] {
  const candidates: Candidate[] = []
  const scale = 375 / width
  for (const mark of marks) {
    const placed = projectMark(place, mark, terrain)
    if (!placed) continue
    const { offset, ...projected } = placed
    if (cityMode && projected.layer === 'near' && isGenericHighrise(mark.kind, mark.glyph)) continue
    const band = mark.source === 'curated' || (!terrain.sightAt && mark.kind === 'highrise')
      ? 3 : projected.layer === 'near' ? 1.5 : 3
    if (!terrain.sightAt && Math.abs(offset.dy) > band) continue
    const points = projected.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const elevations = projected.layer === 'near' ? terrain.nearElevations : terrain.farElevations
    if (projected.plain) {
      const { baseY, hPx, visibleTopY } = projected.plain
      const nearY = groundY(terrain.nearPoints.map(([x, y]) => ({ x, y })), projected.x)
      if (hPx < 3 || (visibleTopY ?? baseY) >= Math.min(nearY, 114)) continue
    }
    if (!projected.plain && Math.abs(elevationAt(elevations, projected.x) ?? 2) <= 1) continue
    if (projected.layer === 'far') {
      const farY = groundY(points.map(([x, y]) => ({ x, y })), projected.x)
      const nearY = groundY(terrain.nearPoints.map(([x, y]) => ({ x, y })), projected.x)
      if (farY > nearY - 4) continue
    }
    const fixed = mark.kind === 'homes' ? Math.max(6, Math.min(14, mark.heightM)) : FIXED[mark.kind]
    const h = projected.plain?.hPx ?? fixed ?? markHeight(mark.heightM, projected.layer === 'near' ? 'near' : 'far')
    candidates.push({
      mark, dx: offset.dx, dy: offset.dy, ...projected,
      width: markWidth(mark.kind, mark.glyph, h) * scale,
      score: mark.kind === 'homes' && mark.source === 'place' ? Number.MAX_SAFE_INTEGER : score(mark, offset.dx, offset.dy, band),
    })
  }
  const homes = marks.find(isPlaceHomes)
  /** The place's own worship halls and towers skip the contest: they stand at their true x inside the cluster. */
  const absorbed = new Set(homes ? candidates.filter((item) => item.layer === 'near' && (ABSORB.has(item.mark.kind)
    || (!terrain.sightAt && item.mark.kind === 'highrise'))
    && Math.hypot(item.dx, item.dy) <= .6).sort((a, b) => b.score - a.score).slice(0, 3) : [])
  const chosen = select(candidates.filter((item) => !isPlaceHomes(item.mark) && !absorbed.has(item)), width,
    !terrain.sightAt && homes?.glyph === 'homes-large')
  const center = Number.parseFloat(terrain.centerLeft) / 100 * 375
  const villageHalf = homeHalf * scale
  /** Curated city landmarks stand among the city's own blocks: they only keep clear of the dot. */
  const curatedCity = chosen.some((item) => item.mark.source === 'curated'
    || (!terrain.sightAt && homes?.glyph === 'homes-large' && item.mark.kind === 'highrise' && Math.hypot(item.dx, item.dy) <= 3))
  const keepClear = curatedCity || cityMode ? 7 * scale : villageHalf
  const edge = 8 * scale
  const inside = [...absorbed].sort((a, b) => a.x - b.x).map((item) => {
    const clear = 8 * scale + item.width / 2
    return Math.abs(item.x - center) >= clear ? item : { ...item, x: center + (item.x < center ? -clear : clear) }
  }).filter((item, index, all) => all.slice(0, index).every((other) => Math.abs(other.x - item.x) >= (other.width + item.width) / 2))
  const absorbedIds = new Set(inside.map((item) => item.mark.id))
  const spaced = [...inside, ...chosen.filter(item => item.plain), ...(['far', 'near'] as const).flatMap((layer) => spread(
    chosen.filter((item) => item.layer === layer),
    6 * scale,
    layer === 'near' ? [center - keepClear, center + keepClear] : undefined, scale,
  ))].filter((item) => item.x - item.width / 2 >= edge && item.x + item.width / 2 <= 375 - edge)
  const labelRight = terrain.seaSide === 'west' ? 375 * .06 + 44 * scale
    : terrain.seaSide === 'east' ? 375 * .94 : 375 * .73
  const labelLeft = labelRight - 44 * scale
  const clearLabel = spaced.flatMap((item) => {
    if (!terrain.seaInView) return [item]
    const points = item.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const base = item.plain?.baseY ?? groundY(points.map(([x, y]) => ({ x, y })), item.x)
    const top = item.plain?.visibleTopY ?? base - (item.plain?.hPx ?? markHeight(item.mark.heightM, item.layer === 'near' ? 'near' : 'far'))
    if (top >= terrain.seaY - 2 || base <= terrain.seaY - 14) return [item]
    const shifted = avoid(item, [labelLeft, labelRight], scale)
    return shifted && (!item.plain || shifted === item) ? [shifted] : []
  })
  return clearLabel.flatMap((item) => {
    const points = item.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const baseY = item.plain?.baseY ?? (terrain.drawn && item.x >= 150 && item.x <= 200
      ? 96 : groundY(points.map(([x, y]) => ({ x, y })), item.x))
    const fixed = item.mark.kind === 'homes' ? Math.max(6, Math.min(14, item.mark.heightM)) : FIXED[item.mark.kind]
    let hPx = item.plain?.hPx ?? fixed ?? markHeight(item.mark.heightM, item.layer === 'near' ? 'near' : 'far')
    // Near the sides a high ridge leaves little sky: a tall mark is cut down to fit, and dropped when too little is left.
    // (Low fixed-size marks such as an orchard or a solar field always fit and stay.)
    if (!item.plain && (item.x < 110 || item.x > 265) && hPx > baseY - 22) {
      hPx = Math.min(hPx, Math.floor(baseY - 22))
      if (hPx < 10) return []
    }
    return [{
      id: item.mark.id, kind: item.mark.kind, glyph: item.mark.glyph ?? item.mark.kind,
      layer: item.layer, xPct: item.x / 375 * 100, baseY,
      ...(item.plain ? { km: item.dx } : {}),
      hPx,
      ...(item.plain?.visibleTopY === undefined ? {} : { visibleTopY: item.plain.visibleTopY }),
      lights: LIGHTS.has(item.mark.kind) || LIT_CUSTOM.has(item.mark.glyph ?? '') ? 4 : 0,
      tall: item.mark.heightM >= 60,
      dy: item.dy,
      ...(absorbedIds.has(item.mark.id) || (homes && item.mark.source === 'curated' && item.layer === 'near'
        && Math.abs(item.x - center) < villageHalf) ? { absorbed: true } : {}),
    }]
  })
}
