import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildDataset, type LandmarkIndex } from '../../../scripts/landmarks/build'
import type { Row } from './israelData'
const created: string[] = []

afterEach(async () => {
  await Promise.all(created.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Israel landmark builder', () => {
  it('classifies a GeoJSON sequence and writes compact cells plus an index', async () => {
    const input = await readFile('src/data/landmarks/fixtures/israel.geojsonseq', 'utf8')
    const outputDir = await mkdtemp(join(tmpdir(), 'shamayim-landmarks-'))
    created.push(outputDir)
    const result = await buildDataset(input, { outputDir, generatedAt: '2026-11-17T02:00:00.000Z',
      bbox: [31, 35, 32, 36] })

    expect(result.marks).toBe(7)
    expect(result.bytes).toBeLessThan(150_000)
    const index = JSON.parse(await readFile(join(outputDir, 'index.json'), 'utf8')) as LandmarkIndex
    expect(index).toEqual({ generatedAt: '2026-11-17T02:00:00.000Z',
      source: 'OpenStreetMap via Geofabrik (ODbL)', bbox: [31, 35, 32, 36], cells: ['316_351'] })
    const rows = JSON.parse(await readFile(join(outputDir, '316_351.json'), 'utf8')) as Row[]
    expect(rows).toEqual(expect.arrayContaining([
      ['waterTower', 31.6092, 35.1009, 25, 'מגדל מים'],
      ['minaret', 31.61, 35.101, 30],
      ['minaret', 31.62, 35.105, 30, 'מסגד'],
      ['highrise', 31.611, 35.111, 120, 'מגדל'],
      ['synagogue', 31.611, 35.131, 9, 'בית כנסת'],
      // Fame last: an article (2) or only a Wikidata item (1); an empty name keeps its place.
      ['church', 31.611, 35.141, 25, '', 2],
      ['waterTower', 31.61, 35.15, 20, 'מגדל מים ידוע', 1],
    ]))
    expect(rows.some((row) => row[0] === 'highrise' && row[3] === 10)).toBe(false)
  })
})
