import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { farColumns } from '../../../../data/city/farData'
import { decodeFarRuns, FAR_BUDGET, type FarFile } from '../../../../data/city/farGrid'
import { hashId } from '../../../../data/landmarks/hash'
import { farCityPaths } from './FarCity'

const json = readFileSync('public/data/city/il/far.json', 'utf8')
const file = JSON.parse(json) as FarFile
const data = { grid: decodeFarRuns(file.r), towers: file.t }
const modiin = { lat: 31.8969, lon: 35.0095 }
const rosh = { lat: 32.0956, lon: 34.9566 }
const yagur = { lat: 32.7414, lon: 35.0764 }
/** The west (on the right, facing south), as distances from the right edge: the old west-left numbers. */
const westFabric = (place: typeof modiin) => farColumns(place, 375, data).columns
  .filter(bin => bin.left >= 262.5 && bin.built >= .25).map(bin => 375 - bin.right).sort((a, b) => a - b)

it('aligns national data with the due-west transects at both places', () => {
  expect(Buffer.byteLength(json)).toBeLessThanOrEqual(FAR_BUDGET)
  // Modi’in crosses Rehovot’s southern outskirts; central Tel Aviv is ~20 km north of this line.
  expect(westFabric(modiin)).toEqual([24, 64, 66, 68, 70, 72, 74, 76])
  // The Rosh HaAyin transect intersects northern Tel Aviv before reaching the sea.
  expect(westFabric(rosh)).toEqual([96, 102, 108])
  const { towers, columns } = farColumns(rosh, 375, data)
  // Longitude 34.7808° E in north Tel Aviv projects to x≈291.1 (west on the right); the coastal fabric is below the draw threshold.
  const telAvivX = 187.5 - 6.25 * (34.7808 - rosh.lon) * 111.32 * Math.cos(rosh.lat * Math.PI / 180)
  expect(columns.find(bin => bin.left <= telAvivX && bin.right > telAvivX)?.built).toBeCloseTo(.20)
  expect(columns.find(bin => bin.right === 375)).toMatchObject({ built: 0, heightClass: 0 })
  expect(towers.some(tower => tower.x > 262.5 && tower.x < 268 && tower.heightM >= 100)).toBe(true)
  expect(westFabric(yagur)).toEqual([])
})

it('seats the silhouette and towers, glows west of Modi’in, and obeys ridge occlusion', () => {
  const far = () => 70
  const near = () => 74
  const columns = farColumns(modiin, 375, data)
  const seed = hashId('modiin')
  const night = farCityPaths(columns, near, far, seed, true)
  // West of Modi’in is on the right now (the old run at 64–78 px, mirrored).
  expect(night.fabric).toMatch(/M297 .*V70L297 70Z/)
  expect(night.slabs).toContain('h2.5V70h-2.5Z')
  expect(night.dots).toMatch(/M(?:29[89]|30\d|31[0-5]|35[01])\./)
  expect(farCityPaths(columns, near, far, seed, true)).toEqual(night)
  expect(farCityPaths(columns, near, far, seed, false)).toEqual({ ...night, dots: '' })
  expect(farCityPaths(columns, () => 73.99, far, seed, true)).toEqual({ fabric: '', slabs: '', dots: '' })
})
