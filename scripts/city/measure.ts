import { sizeClass } from '../../src/data/city/form'
import { offsetKm } from '../../src/data/landmarks/project'
import { Cover } from './cover'
import { features, records } from './geometry'
import { references } from './regions'
import { survey } from './survey'

const [input, places] = process.argv.slice(2)
if (!input || !places) throw new Error('Usage: tsx scripts/city/measure.ts city.geojsonseq places.geojsonseq')
const roofKeys = ['roof:shape', 'roof:material', 'roof:colour']
const boxes = references.map(([name, lat, lon]) => ({
  name, lat, lon, histogram: Array<number>(7).fill(0), roof: [0, 0, 0], buildings: 0,
}))
const cover = new Cover()
for await (const { shape, tags } of features(input)) {
  if (!tags.building || tags.building === 'no') continue
  cover.add(shape)
  for (const box of boxes) {
    // Reference boxes extend 1.5 km on each axis from the plan's coordinates.
    const { dx, dy } = offsetKm(box, shape)
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) continue
    box.buildings++
    box.histogram[sizeClass(shape.area) - 1]++
    roofKeys.forEach((key, i) => { if (tags[key]) box.roof[i]++ })
  }
}
console.table(boxes.map(({ name, lat, lon, buildings, histogram, roof }) => ({
  name, buildings, histogram: histogram.join(' / '),
  roofPercent: roof.map(n => (100 * n / (buildings || 1)).toFixed(2)).join(' / '),
  coverPercent: (100 * cover.at(lat, lon)).toFixed(2),
})))
const kinds = new Map<string, { nodes: number; population: number }>()
const religions = new Map<string, number>()
for await (const { tags } of records(places)) {
  if (tags.place) {
    const count = kinds.get(tags.place) ?? { nodes: 0, population: 0 }
    count.nodes++
    if (tags.population) count.population++
    kinds.set(tags.place, count)
  }
  if (tags.amenity === 'place_of_worship') {
    const key = tags.religion || '(missing)'
    religions.set(key, (religions.get(key) ?? 0) + 1)
  }
}
console.table(Object.fromEntries(kinds))
console.table(Object.fromEntries(religions))
console.table(await survey(input))
