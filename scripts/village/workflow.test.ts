// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { OSM } from './input'
import { writeTiles } from './write'

const workflow = readFileSync('.github/workflows/village.yml', 'utf8')
const step = (name: string) => workflow.split(/^ {6}- /m).find(text => text.includes(`name: ${name}`) && text.includes('upload-artifact')) ?? ''

describe('the data workflow', () => {
  it('pins the runtimes to the patch', () => {
    expect(workflow).toMatch(/node-version: '?22\.\d+\.\d+/)
    expect(workflow).toMatch(/python-version: '?3\.13\.\d+/)
  })
  it('gives out tiles only of a build that passed, and the report always', () => {
    expect(step('village-tiles')).not.toBe('')
    expect(step('village-tiles')).not.toContain('always()')
    expect(step('village-report')).toContain('always()')
  })
})

it('a build that fails a gate writes no tile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'village-')), out = join(dir, 'il')
  const houses = Array.from({ length: 10 }, (_, i) => [31.64, 35.04 + i * 3e-4, 15, 10, 0, 150, OSM])
  writeFileSync(join(dir, 'groups.jsonl'), JSON.stringify({ places: [[31.64, 35.04]], houses }))
  writeFileSync(join(dir, 'facts.json'), JSON.stringify({ buildings: 10, kept: 10, partSources: 0, datasets: { [OSM]: 10 }, keptDatasets: { [OSM]: 10 } }))
  const expected = { buildings: 10, kept: 10, osm: 10, microsoft: 0, groups: 1, places: 1, houses: 99, tiles: 1 }
  writeFileSync(join(dir, 'source.json'), JSON.stringify({ release: 'r', tolerance: .03, expected }))
  const run = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/village/build.ts', dir, '--out', out, '--source', join(dir, 'source.json')],
    { encoding: 'utf8' })
  expect(run.stderr).toContain('FAIL: houses')
  expect(run.status).toBe(1)
  expect(readdirSync(dir)).not.toContain('il')
}, 60_000)

it('the tiles go out with their licence, and its share-alike', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'village-'))
  await writeTiles(dir, new Map([['316_350', '{}']]), '2026-11-18.0')
  const notice = readFileSync(join(dir, 'LICENSE.txt'), 'utf8')
  for (const words of ['Derivative', 'Share-alike', 'https://opendatacommons.org/licenses/odbl/1-0/', 'OpenStreetMap', 'Microsoft', '2026-11-18.0'])
    expect(notice).toContain(words)
})