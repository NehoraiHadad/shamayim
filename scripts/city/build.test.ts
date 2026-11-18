import { mkdtemp, readdir, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { decodeRuns } from '../../src/data/city/grid'
import { buildCity } from './build'
import { survey } from './survey'

const fixture = resolve('scripts/city/fixtures/sample.geojsonseq')

it('streams the fixture through measurement, rasterization and the on-disk format', async () => {
  const output = await mkdtemp(join(tmpdir(), 'city-builder-'))
  try {
    await writeFile(join(output, '999_999.json'), '{}')
    const report = await buildCity(fixture, output, '2026-11-18T00:00:00Z')
    const index = JSON.parse(await readFile(join(output, 'index.json'), 'utf8'))
    const cell = JSON.parse(await readFile(join(output, '320_348.json'), 'utf8'))
    expect(report.coverage).toEqual(await survey(fixture))
    expect(report.coverage[0]).toMatchObject({ buildings: 3, taggedShare: 2 / 3, typeShare: 1 / 3 })
    expect(index.cells).toEqual(['320_348'])
    expect(cell.v).toBe(1)
    expect(cell.t).toEqual([[32.00315, 34.80315, 48, 1, 'מגדל בדיקה'], [32.0031, 34.80406, 38.4, 0]])
    expect(decodeRuns(cell.r).some(byte => byte > 0)).toBe(true)
    await expect(readFile(join(output, '999_999.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    for (const file of await readdir(output)) await unlink(join(output, file))
    await rmdir(output)
  }
})
