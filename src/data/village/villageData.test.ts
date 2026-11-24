import { afterEach, describe, expect, it, vi } from 'vitest'
import { storedGroup, storedTile } from '../../test/villageTile'
import { COVER } from '../land/grid'
import type { LandCover } from '../land/landData'
import { settlementOf, type SettlementInput } from './settlementOf'
import { readTile } from './tile'
import { loadVillageTile, resetVillageTiles, villageTileKey, VILLAGE_ROOT, type TileList } from './villageData'

const PLACE = { lat: 31.6, lon: 35.1001 }, ELSEWHERE = { lat: 32.6, lon: 35.1001 }
const LIST: TileList = { release: '2026-11-18.0', version: 'abc', cells: ['316_351'] }
const answer = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as unknown as typeof fetch
const load = (fetchImpl: typeof fetch, place = PLACE, timeoutMs?: number) => loadVillageTile(place, undefined, fetchImpl, LIST, timeoutMs)

afterEach(() => { resetVillageTiles(); vi.unstubAllGlobals() })

describe('the tile a place stands in', () => {
  it('is asked for once, by the list\'s version', async () => {
    const fetchImpl = answer(storedTile())
    expect((await load(fetchImpl))!.groups).toHaveLength(1)
    expect(vi.mocked(fetchImpl).mock.calls.map(([url]) => url)).toEqual([`${VILLAGE_ROOT}/316_351.json?v=abc`])
  })
  it('is never asked for where the list has none', async () => {
    const fetchImpl = answer(storedTile())
    expect(await load(fetchImpl, ELSEWHERE)).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(villageTileKey(ELSEWHERE, LIST)).toBeNull()
  })
  it('is the same one on either side of the date line', () => {
    const list = { ...LIST, cells: ['-170_-1800'] }
    expect(villageTileKey({ lat: -16.95, lon: 180.05 }, list)).toBe(villageTileKey({ lat: -16.95, lon: -179.95 }, list))
  })
  it.each([
    ['a missing file', answer('', 404)], ['a failing server', answer('', 503)],
    ['the app\'s page in its place', answer('<!doctype html><html></html>')],
    ['half a file', answer(JSON.stringify(storedTile()).slice(0, 200))],
    ['another version', answer({ ...storedTile(), v: 2 })],
    ['another release', answer(storedTile({ release: '2026-10-21.0' }))],
    ['no licence', answer({ ...storedTile(), licence: undefined })],
    ['another licence', answer({ ...storedTile(), licence: 'CC0-1.0' })],
    ['no credit', answer(storedTile({ credits: [] }))],
    ['a broken group', answer(storedTile({ groups: [storedGroup({ h: 'AQ==' })] }))],
    ['a file too large', answer(JSON.stringify(storedTile()) + ' '.repeat(64 * 1024))],
    ['no network', vi.fn(async () => { throw new TypeError('offline') }) as unknown as typeof fetch],
  ])('is none from %s', async (_, fetchImpl) => expect(await load(fetchImpl)).toBeNull())
  it('is none when the answer does not come', async () =>
    expect(await load(vi.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch, PLACE, 20)).toBeNull())
  it('is none to who has left', async () => {
    const fetchImpl = answer(storedTile())
    expect(await loadVillageTile(PLACE, AbortSignal.abort(), fetchImpl, LIST)).toBeNull()
  })
  it('is held, and a failure is not', async () => {
    const good = storedTile(), answers = [new Response('', { status: 503 }), Response.json(good), Response.json(good)]
    const fetched = vi.fn(async () => answers.shift()!)
    vi.stubGlobal('fetch', fetched)
    const ask = () => loadVillageTile(PLACE, undefined, fetch, LIST)
    expect(await ask()).toBeNull()
    expect(await ask()).not.toBeNull()
    expect(await ask()).toBe(await ask())
    expect(fetched).toHaveBeenCalledTimes(2)
  })
})

describe('the settlement', () => {
  const built = { coverAt: () => COVER.indexOf('built') } as LandCover
  const tile = readTile(storedTile())
  const arrive = (order: (keyof SettlementInput)[], last: SettlementInput) => {
    const input: SettlementInput = { tile: undefined, cover: null }
    return order.map(name => {
      Object.assign(input, { [name]: last[name] })
      return settlementOf(PLACE, input)
    })
  }
  const orders: (keyof SettlementInput)[][] = [['tile', 'cover'], ['cover', 'tile']]

  it.each(orders)('is the same footprints with %s first, %s last', (...order) => {
    const seen = arrive(order, { tile, cover: built })
    expect(seen.at(-1)).toEqual(settlementOf(PLACE, { tile, cover: built }))
    expect(seen.at(-1)).toMatchObject({ kind: 'footprints' })
    expect(seen.some(s => s?.kind === 'cells')).toBe(false)
  })
  it.each(orders)('is the same cells with %s first, %s last, when there is no tile', (...order) =>
    expect(arrive(order, { tile: null, cover: built }).at(-1)).toEqual(settlementOf(PLACE, { tile: null, cover: built })))
  it('is not known before the tile is settled', () =>
    expect(settlementOf(PLACE, { tile: undefined, cover: built })).toBeUndefined())
  it('is the cells where the tile holds no group of the place', () => {
    const far = readTile(storedTile({ groups: [storedGroup({ o: [31.65, 35.15], p: [[31.65, 35.15]] })] }))
    expect(settlementOf(PLACE, { tile: far, cover: built })).toMatchObject({ kind: 'cells' })
  })
  it('is none with neither', () => expect(settlementOf(PLACE, { tile: null, cover: null })).toBeNull())
})
