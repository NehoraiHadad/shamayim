import type { LandCover } from '../land/landData'
import { COVER } from '../land/grid'
import { offsetKm, type Coordinate } from './project'
import type { Landmark } from './types'

/** How far round the place the land cover is read for its portrait (km). */
export const COVER_KM = 1.5
/** Sample spacing (km): about two land-cover cells. */
const STEP_KM = 0.1
/** Share of the land on one side under trees that makes trees a key element of the place. */
const TREE_SHARE = 0.06

const TREE = COVER.indexOf('tree')
const GROVES = new Set<Landmark['kind']>(['orchard', 'palms', 'vineyard'])

/**
 * A key element the map does not name but the satellite sees (ESA WorldCover): trees by the place (an orchard, a
 * grove, date palms), on the east and on the west side of it. Each side with enough trees becomes one orchard mark at
 * the middle of its trees, so the portrait shows it on its true side. A side the map already gives a grove keeps the
 * map's.
 */
export function coverMarks(place: Coordinate & { id: string }, cover: LandCover | null, mapped: Landmark[]): Landmark[] {
  if (!cover) return []
  const kmLat = 111.32, kmLon = 111.32 * Math.cos((place.lat * Math.PI) / 180)
  const sides = { east: { land: 0, tree: [] as [number, number][] }, west: { land: 0, tree: [] as [number, number][] } }
  for (let dy = -COVER_KM; dy <= COVER_KM + 1e-9; dy += STEP_KM) {
    for (let dx = -COVER_KM; dx <= COVER_KM + 1e-9; dx += STEP_KM) {
      if (Math.hypot(dx, dy) > COVER_KM || Math.abs(dx) < STEP_KM / 2) continue
      const value = cover.coverAt(place.lat + dy / kmLat, place.lon + dx / kmLon)
      if (!value) continue
      const side = sides[dx > 0 ? 'east' : 'west']
      side.land += 1
      if (value === TREE) side.tree.push([dx, dy])
    }
  }
  const groveOn = (east: boolean) => mapped.some(mark => GROVES.has(mark.kind)
    && Math.hypot(offsetKm(place, mark).dx, offsetKm(place, mark).dy) <= 3 && (offsetKm(place, mark).dx > 0) === east)
  return (['east', 'west'] as const).flatMap(name => {
    const side = sides[name]
    if (!side.land || groveOn(name === 'east')) return []
    if (side.tree.length / side.land < TREE_SHARE) return []
    const at = side.tree.reduce(([a, b], [x, y]) => [a + x / side.tree.length, b + y / side.tree.length], [0, 0])
    return [{ id: `${place.id}-cover-${name}`, kind: 'orchard', glyph: 'orchard', lat: place.lat + at[1] / kmLat,
      lon: place.lon + at[0] / kmLon, heightM: 6, source: 'cover' } satisfies Landmark]
  })
}
