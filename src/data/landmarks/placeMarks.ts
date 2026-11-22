import { byPriority, fewLandmarks, PORTRAIT_LANDMARKS } from './portraitSelection'
export { PORTRAIT_LANDMARKS } from './portraitSelection'
import { markAppearance } from './markAppearance'
import { isPlaceHomes, legacyHomeHalf } from './homeMarks'
export { markAppearance } from './markAppearance'
export { placeHomes, withPlaceHomes, isPlaceHomes, settlementSize } from './homeMarks'
import { perspectiveFields } from './perspectiveFields'
import type { Place } from '../../config/place'
import type { NoteBox } from '../terrain/sceneNotes'
import { viableNeighbour, neighbourRule } from '../../world/neighbourPolicy'
import { glyphOf } from '../../world/glyphSpecs'
import type { SceneTerrain } from '../terrain/terrain'
import { isLandmark } from './fame'
import { elevationAt, projectMark, type Portrait } from './markProjection'
import { PORTRAIT_MARGIN_KM } from './portrait'
import { groundY, markHeight, markWidth } from './project'
import { avoid, score, select, spread, type Candidate, type FarRule } from './rank'
import type { Landmark, MarkPerspective, PlacedMark } from './types'

export const isGenericHighrise = (kind: Landmark['kind'], glyph?: string) =>
  kind === 'highrise' && (glyph === undefined || glyph === 'highrise')

const FIXED: Partial<Record<Landmark['kind'], number>> = { solar: 3, orchard: 6, palms: 11 }
/** Towers too: a city's high-rises rise out of its blocks instead of standing alone beside an empty hill. */
const ABSORB = new Set<Landmark['kind']>(['synagogue', 'waterTower', 'minaret', 'church', 'silo'])
/**
 * `notes`: the boxes of the notes written on the land (`sceneNotes`: the sea-level datum, the water's names), in px at
 * the real width; a mark standing in one moves aside, or is left out.
 */
export function placeMarks(place: Place, terrain: SceneTerrain, marks: Landmark[], width: number,
  homeHalf = legacyHomeHalf(marks), cityMode = false, portrait?: Portrait, notes: readonly NoteBox[] = [],
  farRule: FarRule = 'kind', perspective?: MarkPerspective): PlacedMark[] {
  const candidates: Candidate[] = []
  const scale = 375 / width
  for (const mark of marks) {
    const placed = projectMark(place, mark, terrain, portrait && { ...portrait, innerPx: homeHalf * scale })
    if (!placed) continue
    const { offset, ...projected } = placed
    const ground = projected.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const base = projected.plain?.baseY ?? groundY(ground.map(([x, y]) => ({ x, y })), projected.x)
    const angular = perspective?.(mark, projected.layer, base)
    const hPx = angular?.hPx
    const famousNeighbour = angular && neighbourRule(glyphOf(mark) ?? mark.kind, isLandmark(mark)) === 'landmark'
    if (hPx !== undefined && !viableNeighbour(glyphOf(mark) ?? mark.kind, isLandmark(mark), hPx)) continue
    if (cityMode && projected.layer === 'near' && isGenericHighrise(mark.kind, mark.glyph)) continue
    const band = mark.source === 'curated' || (!terrain.sightAt && mark.kind === 'highrise')
      ? 3 : projected.layer === 'near' ? 1.5 : 3
    if (!terrain.sightAt && Math.abs(offset.dy) > band) continue
    const points = projected.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const elevations = projected.layer === 'near' ? terrain.nearElevations : terrain.farElevations
    if (projected.plain) {
      const { baseY, hPx, visibleTopY } = projected.plain
      const nearY = groundY(terrain.nearPoints.map(([x, y]) => ({ x, y })), projected.x)
      if (perspective ? visibleTopY !== undefined && neighbourRule(glyphOf(mark) ?? mark.kind,
        isLandmark(mark)) !== 'landmark' : hPx < 3 || (visibleTopY ?? baseY) >= Math.min(nearY, 114)) continue
    }
    if (!famousNeighbour && !projected.plain && Math.abs(elevationAt(elevations, projected.x) ?? 2) <= 1) continue
    if (!famousNeighbour && projected.layer === 'far') {
      const farY = groundY(points.map(([x, y]) => ({ x, y })), projected.x)
      const nearY = groundY(terrain.nearPoints.map(([x, y]) => ({ x, y })), projected.x)
      if (farY > nearY - 4) continue
    }
    const fixed = mark.kind === 'homes' ? Math.max(6, Math.min(14, mark.heightM)) : FIXED[mark.kind]
    const h = hPx ?? projected.plain?.hPx ?? fixed ?? markHeight(mark.heightM, projected.layer === 'near' ? 'near' : 'far')
    candidates.push({
      mark, dx: offset.dx, dy: offset.dy, ...projected,
      ...angular,
      width: markWidth(mark.kind, mark.glyph, h) * scale,
      score: mark.kind === 'homes' && mark.source === 'place' ? Number.MAX_SAFE_INTEGER : score(mark, offset.dx, offset.dy, band),
    })
  }
  const homes = marks.find(isPlaceHomes)
  // Few landmarks in the contest too (some to spare for those placing drops), so they do not crowd out the rest.
  candidates.splice(0, candidates.length, ...fewLandmarks(candidates, 2 * PORTRAIT_LANDMARKS))
  /** The place's own worship halls and towers skip the contest: they stand at their true x inside the cluster. */
  const absorbed = new Set(homes ? candidates.filter((item) => item.layer === 'near' && (ABSORB.has(item.mark.kind)
    || (!terrain.sightAt && item.mark.kind === 'highrise'))
    && Math.hypot(item.dx, item.dy) <= .6
    // A city's own landmarks (famous, or hand-drawn: the Tower of David, Azrieli, the Báb) stand among its blocks,
    // anywhere in its built-up area.
    || (item.portrait && isLandmark(item.mark)
      && Math.hypot(item.dx, item.dy) <= Math.max(.6, (portrait?.reachKm ?? 0) - PORTRAIT_MARGIN_KM)))
    .sort(byPriority).slice(0, 4) : [])
  const chosen = select(candidates.filter((item) => !isPlaceHomes(item.mark) && !absorbed.has(item)), width,
    !terrain.sightAt && homes?.glyph === 'homes-large', farRule)
  const center = Number.parseFloat(terrain.centerLeft) / 100 * 375
  const villageHalf = homeHalf * scale
  /** Curated city landmarks stand among the city's own blocks: they only keep clear of the dot. */
  const curatedCity = chosen.some((item) => item.mark.source === 'curated'
    || (!terrain.sightAt && homes?.glyph === 'homes-large' && item.mark.kind === 'highrise' && Math.hypot(item.dx, item.dy) <= 3))
  const keepClear = curatedCity || cityMode ? 7 * scale : villageHalf
  const edge = 8 * scale
  // Where two would overlap, the icon or the better known stays.
  const inside = [...absorbed].sort(byPriority).map((item) => {
    const clear = 8 * scale + item.width / 2
    return Math.abs(item.x - center) >= clear ? item : { ...item, x: center + (item.x < center ? -clear : clear) }
  }).reduce<Candidate[]>((kept, item) => kept.every((other) => Math.abs(other.x - item.x) >= (other.width + item.width) / 2)
    ? [...kept, item] : kept, []).sort((a, b) => a.x - b.x)
  const absorbedIds = new Set(inside.map((item) => item.mark.id))
  const spaced = [...inside, ...chosen.filter(item => item.plain), ...(['far', 'near'] as const).flatMap((layer) => spread(
    chosen.filter((item) => item.layer === layer),
    6 * scale,
    layer === 'near' ? [center - keepClear, center + keepClear] : undefined, scale,
  ))].filter((item) => item.x - item.width / 2 >= edge && item.x + item.width / 2 <= 375 - edge)
    // What stands among the roofs keeps its spot: a near building spread onto it gives way.
    .filter((item) => inside.includes(item) || item.layer !== 'near' || FIXED[item.mark.kind] !== undefined
      || inside.every((other) => Math.abs(other.x - item.x) >= (other.width + item.width) / 2))
  const boxes = notes.map((box) => ({ ...box, left: box.left * scale, right: box.right * scale }))
  const clearLabel = spaced.flatMap((item) => {
    // The place's own portrait is composed round the dot and stays: the note gives way to it, not the reverse.
    if (item.portrait) return [item]
    const points = item.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const base = item.plain?.baseY ?? groundY(points.map(([x, y]) => ({ x, y })), item.x)
    const top = item.plain?.visibleTopY ?? base - (item.plain?.hPx ?? markHeight(item.mark.heightM, item.layer === 'near' ? 'near' : 'far'))
    let moved: Candidate | null = item
    for (const box of boxes) {
      if (!moved || top >= box.bottom || base <= box.top) continue
      const shifted: Candidate | null = avoid(moved, [box.left, box.right], scale)
      moved = shifted && (!item.plain || shifted === moved) ? shifted : null
    }
    return moved ? [moved] : []
  })
  return fewLandmarks(clearLabel).flatMap((item) => {
    const points = item.layer === 'near' ? terrain.nearPoints : terrain.farPoints
    const baseY = item.plain?.baseY ?? groundY(points.map(([x, y]) => ({ x, y })), item.x)
    const fixed = item.mark.kind === 'homes' ? Math.max(6, Math.min(14, item.mark.heightM)) : FIXED[item.mark.kind]
    let hPx = item.hPx ?? item.plain?.hPx ?? fixed ?? markHeight(item.mark.heightM, item.layer === 'near' ? 'near' : 'far')
    // Near the sides a high ridge leaves little sky: a tall mark is cut down to fit, and dropped when too little is left.
    // (Low fixed-size marks such as an orchard or a solar field always fit and stay.)
    if (!perspective && !item.plain && (item.x < 110 || item.x > 265) && hPx > baseY - 22) {
      hPx = Math.min(hPx, Math.floor(baseY - 22))
      if (hPx < 10) return []
    }
    return [{
      id: item.mark.id, kind: item.mark.kind, ...markAppearance(item.mark),
      layer: item.layer, xPct: item.x / 375 * 100, baseY,
      ...(item.plain ? { km: item.dx } : {}),
      hPx,
      ...perspectiveFields(item),
      ...(item.plain?.visibleTopY === undefined ? {} : { visibleTopY: item.plain.visibleTopY }),
      dy: item.dy,
      ...(item.portrait ? { portrait: true } : {}),
      ...(isLandmark(item.mark) ? { landmark: true } : {}),
      ...(absorbedIds.has(item.mark.id) || (homes && item.mark.source === 'curated' && item.layer === 'near'
        && Math.abs(item.x - center) < villageHalf) ? { absorbed: true } : {}),
    }]
  })
}
