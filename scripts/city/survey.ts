import { Cover } from './cover'
import type { PlaceIndex } from './places'
import { cellKey } from '../../src/data/city/grid'
import { contains, features, LANDUSE, type Feature } from './geometry'
import { footprintHeight, NearbyHeights, resolveHeight, taggedHeight } from './heights'

import { urbanRegions as regions } from './regions'

const isBuilding = ({ building }: Feature['tags']) => Boolean(building && building !== 'no')

export async function survey(path: string, options: {
  landuse?: (feature: Feature) => void
  building?: (feature: Feature, height: number, tagged: number | undefined, original: number, evidence: boolean, urban: boolean) => void
  places?: PlaceIndex
} = {}) {
  const cover = options.places && new Cover()
  const nearby = new NearbyHeights()
  const residential = new Map<string, Feature['polygons'][]>()
  for await (const feature of features(path)) {
    const { tags, polygons, shape } = feature
    if (isBuilding(tags)) {
      cover?.add(shape)
      const height = taggedHeight(tags)
      if (height !== undefined) nearby.add({ lat: shape.lat, lon: shape.lon }, height)
    }
    if (!tags.landuse || !LANDUSE.has(tags.landuse)) continue
    options.landuse?.(feature)
    if (tags.landuse !== 'residential') continue
    const keys = new Set<string>()
    const [south, west] = cellKey(shape.south, shape.west).split('_').map(Number)
    const [north, east] = cellKey(shape.north, shape.east).split('_').map(Number)
    for (let y = south; y <= north; y++) for (let x = west; x <= east; x++) keys.add(`${y}_${x}`)
    for (const key of keys) {
      const bin = residential.get(key) ?? []
      bin.push(polygons)
      residential.set(key, bin)
    }
  }

  const counts = regions.map(([region]) => ({ region, buildings: 0, tagged: 0, typed: 0 }))
  for await (const feature of features(path)) {
    const { tags, shape } = feature
    if (!isBuilding(tags)) continue
    const { lat, lon } = shape
    const inResidential = tags.building === 'residential' || (tags.building === 'yes' &&
      (residential.get(cellKey(lat, lon)) ?? []).some(polygons => contains(polygons, lon, lat)))
    const { height, source } = resolveHeight(tags, inResidential, shape, nearby)
    if (options.building) {
      const node = options.places?.nearest(shape)
      // The cover fallback is only evaluated when no place is within twice its reach.
      const density = node ? 0 : cover?.at(lat, lon) ?? 1
      const rural = node ? node[2] >= 2 : density < .10
      const setting = { rural, kind: node?.[2], faith: node?.[3], cover: density }
      const adjusted = source === 'footprint' ? footprintHeight(shape.area, inResidential, setting) : height
      // The non-rural town exception is tracked separately from the unchanged urban prior.
      const urban = !rural && !(node?.[2] === 1 && adjusted !== height)
      options.building(feature, adjusted, source === 'tag' ? height : undefined, height, source !== 'footprint', urban)
    }
    regions.forEach(([, south, west, north, east], i) => {
      if (lat < south || lat > north || lon < west || lon > east) return
      counts[i].buildings++
      if (tags.height || tags['building:levels']) counts[i].tagged++
      if (source === 'type') counts[i].typed++
    })
  }
  return counts.map(({ region, buildings, tagged, typed }) => ({
    region, buildings, taggedShare: buildings ? tagged / buildings : 0, typeShare: buildings ? typed / buildings : 0,
  }))
}
