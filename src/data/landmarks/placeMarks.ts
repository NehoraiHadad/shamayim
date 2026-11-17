import type { Place } from '../../config/place'
import type { SceneTerrain } from '../terrain/terrain'
import { groundY, markHeight, markWidth, offsetKm, toX } from './project'
import { avoid, score, select, spread, type Candidate } from './rank'
import type { Landmark, PlacedMark } from './types'

const FIXED: Partial<Record<Landmark['kind'], number>> = { solar: 3, orchard: 6, palms: 11 }
const LIGHTS = new Set<Landmark['kind']>(['highrise', 'homes', 'church', 'minaret', 'lighthouse'])
const LIT_CUSTOM = new Set(['jerusalem-ymca', 'jerusalem-david', 'jerusalem-wall', 'tel-aviv-shalom',
  'tel-aviv-sarona', 'tel-aviv-azrieli', 'haifa-bab', 'haifa-dagon', 'haifa-sail', 'shadmot-homes'])
const SETTLEMENTS = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'isolated_dwelling', 'locality'])

export function placeHomes(place: Place, osmMarks: Landmark[]): Landmark[] {
  if (!place.featureCode?.startsWith('PPL') && !(place.usesOsm && SETTLEMENTS.has(place.settlementType ?? ''))) return []
  const size = place.population != null
    ? place.population < 2_000 ? 'small' : place.population < 50_000 ? 'medium' : 'large'
    : place.settlementType === 'city' || place.featureCode === 'PPLA' ? 'large'
      : place.settlementType === 'town' || place.featureCode === 'PPLX' ? 'medium' : 'small'
  const skyline = size === 'large' && osmMarks.some((mark) => mark.kind === 'highrise'
    && Math.hypot(offsetKm(place, mark).dx, offsetKm(place, mark).dy) <= 1)
  if (skyline) return []
  const heightM = size === 'small' ? 6 : size === 'medium' ? 8 : 14
  return [{ id: `${place.id}-homes`, kind: 'homes', glyph: `homes-${size}`, nameHe: place.nameHe,
    lat: place.lat, lon: place.lon, heightM, source: 'place' }]
}

export function withPlaceHomes(place: Place, marks: Landmark[], curated = false): Landmark[] {
  return curated ? marks : [...marks, ...placeHomes(place, marks)]
}

function elevationAt(values: number[] | undefined, x: number): number | undefined {
  if (!values?.length) return undefined
  const position = Math.max(0, Math.min(values.length - 1, x / 375 * (values.length - 1)))
  const left = Math.floor(position)
  const t = position - left
  return values[left] + ((values[left + 1] ?? values[left]) - values[left]) * t
}

export function placeMarks(place: Place, terrain: SceneTerrain, marks: Landmark[], width: number): PlacedMark[] {
  const candidates: Candidate[] = []
  const scale = 375 / width
  for (const mark of marks) {
    const offset = offsetKm(place, mark)
    const projected = mark.x == null ? toX(offset.dx) : { x: mark.x, layer: 'near' as const }
    if (!projected) continue
    const band = mark.source === 'curated' ? 3 : projected.layer === 'near' ? 1.5 : 3
    if (Math.abs(offset.dy) > band) continue
    const points = projected.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const elevations = projected.layer === 'near' ? terrain.nearElevations : terrain.farElevations
    if (Math.abs(elevationAt(elevations, projected.x) ?? 2) <= 1) continue
    if (projected.layer === 'far') {
      const farY = groundY(points.map(([x, y]) => ({ x, y })), projected.x)
      const nearY = groundY(terrain.nearPoints.map(([x, y]) => ({ x, y })), projected.x)
      if (farY > nearY - 4) continue
    }
    const fixed = mark.kind === 'homes' ? Math.max(6, Math.min(14, mark.heightM)) : FIXED[mark.kind]
    const h = fixed ?? markHeight(mark.heightM, projected.layer)
    candidates.push({
      mark, dx: offset.dx, dy: offset.dy, x: projected.x, layer: projected.layer,
      width: markWidth(mark.kind, mark.glyph, h) * scale,
      score: mark.kind === 'homes' && mark.source === 'place' ? Number.MAX_SAFE_INTEGER : score(mark, offset.dx, offset.dy, band),
    })
  }
  const chosen = select(candidates, width)
  const center = Number.parseFloat(terrain.centerLeft) / 100 * 375
  const villageHalf = 7 * scale
  const anchored = chosen.filter((item) => item.mark.kind === 'homes' && item.mark.source === 'place')
    .map((item) => ({ ...item, x: center }))
  const spaced = (['far', 'near'] as const).flatMap((layer) => spread(
    chosen.filter((item) => item.layer === layer && !(item.mark.kind === 'homes' && item.mark.source === 'place')),
    (layer === 'near' ? 3 : 6) * scale,
    layer === 'near' ? [center - villageHalf, center + villageHalf] : undefined, scale,
  )).concat(anchored)
  const labelRight = terrain.seaSide === 'west' ? 375 * .06 + 44 * scale
    : terrain.seaSide === 'east' ? 375 * .94 : 375 * .73
  const labelLeft = labelRight - 44 * scale
  const clearLabel = spaced.flatMap((item) => {
    if (item.mark.kind === 'homes' && item.mark.source === 'place') return [item]
    if (!terrain.seaInView) return [item]
    const points = item.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const base = groundY(points.map(([x, y]) => ({ x, y })), item.x)
    const top = base - markHeight(item.mark.heightM, item.layer)
    if (top >= terrain.seaY - 2 || base <= terrain.seaY - 14) return [item]
    const shifted = avoid(item, [labelLeft, labelRight], scale)
    return shifted ? [shifted] : []
  })
  return clearLabel.flatMap((item) => {
    const points = item.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const baseY = place.id === 'shadmot-mehola' && item.x >= 150 && item.x <= 200
      ? 96 : groundY(points.map(([x, y]) => ({ x, y })), item.x)
    const fixed = item.mark.kind === 'homes' ? Math.max(6, Math.min(14, item.mark.heightM)) : FIXED[item.mark.kind]
    let hPx = fixed ?? markHeight(item.mark.heightM, item.layer)
    if (item.x < 110 || item.x > 265) {
      hPx = Math.min(hPx, Math.floor(baseY - 22))
      if (hPx < 10) return []
    }
    return [{
      id: item.mark.id, kind: item.mark.kind, glyph: item.mark.glyph ?? item.mark.kind,
      layer: item.layer, xPct: item.x / 375 * 100, baseY,
      hPx,
      lights: LIGHTS.has(item.mark.kind) || LIT_CUSTOM.has(item.mark.glyph ?? '') ? 4 : 0,
      tall: item.mark.heightM >= 60,
    }]
  })
}
