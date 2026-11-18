import { cellKey } from '../../src/data/city/grid'
import { contains, features, LANDUSE, type Feature } from './geometry'
import { NearbyHeights, resolveHeight, taggedHeight } from './heights'

const regions = [
  ['Gush Dan', 31.95, 34.7, 32.2, 34.95],
  ['Jerusalem', 31.73, 35.17, 31.83, 35.25],
  ['Haifa', 32.75, 34.95, 32.84, 35.05],
  ['Nazareth', 32.68, 35.28, 32.72, 35.33],
  ["Be'er Sheva", 31.22, 34.76, 31.28, 34.83],
] as const

const isBuilding = ({ building }: Feature['tags']) => Boolean(building && building !== 'no')

export async function survey(path: string, options: {
  landuse?: (feature: Feature) => void
  building?: (feature: Feature, height: number, tagged?: number) => void
} = {}) {
  const nearby = new NearbyHeights()
  const residential = new Map<string, Feature['polygons'][]>()
  for await (const feature of features(path)) {
    const { tags, polygons, shape } = feature
    if (isBuilding(tags)) {
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
    options.building?.(feature, height, source === 'tag' ? height : undefined)
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
