import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../../config/place'
import { cellsForStrip, inCoverage, loadIsrael, resetIsraelDataForTests,
  type IsraelLandmarkIndex } from './israelData'
import type { Landmark } from './types'
import { loadLandmarkSource } from './useLandmarks'

const place = (values: Partial<Place> = {}): Place => ({ id: 'karmei-tzur', nameHe: 'כרמי צור', regionHe: '',
  lat: 31.6092, lon: 35.1009, timezone: 'Asia/Jerusalem', ...values })
const index = (values: Partial<IsraelLandmarkIndex> = {}): IsraelLandmarkIndex => ({
  generatedAt: '2026-11-17T02:00:00.000Z', source: 'OpenStreetMap via Geofabrik (ODbL)',
  bbox: [29.45, 34.17, 33.34, 35.9], cells: [], ...values,
})
const mark: Landmark = { id: 'static', kind: 'waterTower', lat: 31.6092, lon: 35.1009,
  heightM: 25, source: 'osm' }

afterEach(() => {
  vi.unstubAllGlobals()
  resetIsraelDataForTests()
})

describe('Israel landmark cells', () => {
  it('covers the near and far strips for Karmei Tzur and Tel Aviv', () => {
    expect(cellsForStrip(place())).toEqual([
      '315_347', '315_348', '315_349', '315_350', '315_351', '315_352', '315_353', '315_354',
      '316_347', '316_348', '316_349', '316_350', '316_351', '316_352', '316_353', '316_354',
    ])
    expect(cellsForStrip(place({ id: 'tel-aviv', lat: 32.0809, lon: 34.7806 }))).toEqual([
      '320_344', '320_345', '320_346', '320_347', '320_348', '320_349', '320_350',
      '321_344', '321_345', '321_346', '321_347', '321_348', '321_349', '321_350',
    ])
  })

  it('checks coverage and treats a missing listed cell as empty', async () => {
    expect(inCoverage(index(), place())).toBe(true)
    expect(inCoverage(index(), place({ lat: 40 }))).toBe(false)
    const cell = cellsForStrip(place())[0]
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => String(input).endsWith('index.json')
      ? new Response(JSON.stringify(index({ cells: [cell] })))
      : new Response('', { status: 404 })))
    await expect(loadIsrael(place(), new AbortController().signal)).resolves.toEqual([])
  })

  it('decodes compact rows with OSM attribution', async () => {
    const cell = cellsForStrip(place())[0]
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => String(input).endsWith('index.json')
      ? new Response(JSON.stringify(index({ cells: [cell] })))
      : new Response(JSON.stringify([['waterTower', 31.6092, 35.1009, 25, 'מגדל מים']]))))
    const marks = await loadIsrael(place(), new AbortController().signal)
    expect(marks).toHaveLength(1)
    expect(marks?.[0]).toMatchObject({ kind: 'waterTower', nameHe: 'מגדל מים', source: 'osm' })
  })
})

describe('fame in the shipped rows', () => {
  it('decodes fame after the name, an empty name left out', async () => {
    const cell = cellsForStrip(place())[0]
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => String(input).endsWith('index.json')
      ? new Response(JSON.stringify(index({ cells: [cell] })))
      : new Response(JSON.stringify([['church', 31.6092, 35.1009, 25, '', 2], ['waterTower', 31.61, 35.1, 25, 'מגדל', 1],
        ['minaret', 31.62, 35.1, 30]]))))
    const marks = await loadIsrael(place(), new AbortController().signal)
    expect(marks?.[0]).toEqual({ id: 'il-church-31.6092-35.1009', kind: 'church', lat: 31.6092, lon: 35.1009, heightM: 25,
      source: 'osm', fame: 2 })
    expect(marks?.[1]).toMatchObject({ nameHe: 'מגדל', fame: 1 })
    expect(marks?.[2].fame).toBeUndefined()
  })
})

describe('landmark source order', () => {
  it('reads Israel data, then Overpass; the curated cities too, with their icons added', async () => {
    const israel = vi.fn(async () => [mark])
    const overpass = vi.fn(async (requested: Place) => [{ ...mark, id: 'overpass',
      lat: requested.lat, lon: requested.lon }])
    const signal = new AbortController().signal
    const jerusalem = await loadLandmarkSource(place({ id: 'jerusalem', lat: 31.769, lon: 35.2163 }), signal,
      { israel, overpass })
    expect(israel).toHaveBeenCalled()
    expect(jerusalem.panoramaMarks.map(item => item.id)).toEqual(expect.arrayContaining(['jerusalem-wall', 'jerusalem-bridge']))
    expect((await loadLandmarkSource(place(), signal, { israel, overpass })).marks[0].id).toBe('static')
    expect(overpass).not.toHaveBeenCalled()
    israel.mockResolvedValueOnce(null as never)
    expect((await loadLandmarkSource(place({ id: 'outside', lat: 40 }), signal,
      { israel, overpass })).marks[0].id).toBe('overpass')
  })
})
