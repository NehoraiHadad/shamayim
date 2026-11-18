import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { decodeFarRuns, encodeFarRuns, FAR_BUDGET, FAR_COLS, FAR_LAT_STEP,
  FAR_LON_STEP, FAR_SOUTH, FAR_WEST, type FarFile } from '../../src/data/city/farGrid'
import { COLS, encodeRuns, ROWS } from '../../src/data/city/grid'
import { buildFar } from './far'

it('round-trips v2 raster shares and levels and enforces the raw byte budget', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'far-city-'))
  try {
    const cell = new Uint8Array(COLS * ROWS * 3)
    for (let i = 0; i < cell.length; i += 3) {
      cell[i] = 0x86
      cell[i + 1] = 32
      cell[i + 2] = 255
    }
    const r = encodeRuns(cell)
    const t = [[32.05, 34.85, 80], [32.05, 34.85, 79.9]]
    await writeFile(join(dir, 'index.json'), JSON.stringify({ cells: ['320_348'] }))
    const cellPath = join(dir, '320_348.json')
    await writeFile(cellPath, JSON.stringify({ v: 2, r, t }))
    const written = await buildFar(dir)
    const json = await readFile(join(dir, 'far.json'), 'utf8')
    const file = JSON.parse(json) as FarFile
    const grid = decodeFarRuns(file.r)
    const row = Math.floor((32.05 - FAR_SOUTH) / FAR_LAT_STEP)
    const col = Math.floor((34.85 - FAR_WEST) / FAR_LON_STEP)
    expect(grid[row * FAR_COLS + col]).toBe(0x86)
    expect(grid[0]).toBe(0)
    expect(encodeFarRuns(grid)).toBe(file.r)
    expect(file.t).toEqual([t[0]])
    expect(Buffer.byteLength(json)).toBe(written)
    expect(written).toBeLessThanOrEqual(FAR_BUDGET)
    await writeFile(cellPath, JSON.stringify({ v: 2, r, t: Array(4000).fill(t[0]) }))
    await expect(buildFar(dir)).rejects.toThrow('far.json exceeds budget')
    expect(await readFile(join(dir, 'far.json'), 'utf8')).toBe(json)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
