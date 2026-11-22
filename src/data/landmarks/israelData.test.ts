import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../../config/place'
import { cellsForStrip, inCoverage, loadIsrael, resetIsraelDataForTests,
  type IsraelLandmarkIndex } from './israelData'
import type { Landmark } from './types'
import { loadLandmarkSource, useLandmarks } from './useLandmarks'
import { HALL_M } from './worship'

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
      : String(input).includes('/crops/') ? new Response('', { status: 404 })
      : new Response(JSON.stringify([['waterTower', 31.6092, 35.1009, 25, 'מגדל מים']]))))
    const marks = await loadIsrael(place(), new AbortController().signal)
    expect(marks).toHaveLength(1)
    expect(marks?.[0]).toMatchObject({ kind: 'waterTower', nameHe: 'מגדל מים', source: 'osm' })
  })

  it('loads crop geometry beside the legacy points without entering it in the portrait shortlist', async () => {
    const crop = { source: 'osm', kind: 'palm', polygons: [[[
      [35.1, 31.60], [35.11, 31.60], [35.11, 31.62], [35.1, 31.62], [35.1, 31.60],
    ]]] }
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('index.json')) return new Response(JSON.stringify(index()))
      return String(input).endsWith('/crops/63_70.json')
        ? new Response(JSON.stringify([[31.61, 35.105, crop]])) : new Response('', { status: 404 })
    }))
    const result = await loadLandmarkSource(place(), new AbortController().signal)
    expect(result.cropAreas).toEqual([crop])
    expect(result.sceneMarks.some((m) => m.kind === 'palms')).toBe(false)
  })

  it('bounds kept crop polygons by actual distance to the place (staying compact at dense Jerusalem)', async () => {
    const nearCrop = { source: 'osm', kind: 'olive', polygons: [[[
      [35.10, 31.605], [35.105, 31.605], [35.105, 31.61], [35.10, 31.61], [35.10, 31.605],
    ]]] }
    // Same 0.1° cell (316_351), ~8.5 km away — must be rejected instead of kept by coarse cell membership.
    const sameCellFar = { source: 'osm', kind: 'orchard', polygons: [[[
      [35.18, 31.66], [35.19, 31.66], [35.19, 31.67], [35.18, 31.67], [35.18, 31.66],
    ]]] }
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('index.json')) return new Response(JSON.stringify(index()))
      return String(input).endsWith('/crops/63_70.json')
        ? new Response(JSON.stringify([[31.607, 35.102, nearCrop], [31.665, 35.185, sameCellFar]]))
        : new Response('', { status: 404 })
    }))
    const filtered = await loadLandmarkSource(place(), new AbortController().signal)
    expect(filtered.cropAreas).toEqual([nearCrop])

    // Real dense sector (Jerusalem, 63_70.json): keeps only polygons overlapping ±3 km, not all 647 cell-box polygons.
    resetIsraelDataForTests()
    const root = path.resolve(__dirname, '../../..')
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const file = path.join(root, 'public', String(input).replace(/^\//, ''))
      return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 })
    }))
    const jerusalem = await loadLandmarkSource(place({ id: 'jerusalem', lat: 31.769, lon: 35.2163 }), new AbortController().signal)
    expect(jerusalem.cropAreas.length).toBeGreaterThan(0)
    expect(jerusalem.cropAreas.length).toBeLessThan(80)
    expect(JSON.stringify(jerusalem.cropAreas).length).toBeLessThan(60_000)
  })
})

describe('fame in the shipped rows', () => {
  it('decodes fame after the name, an empty name left out', async () => {
    const cell = cellsForStrip(place())[0]
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => String(input).endsWith('index.json')
      ? new Response(JSON.stringify(index({ cells: [cell] })))
      : String(input).includes('/crops/') ? new Response('', { status: 404 })
      : new Response(JSON.stringify([['church', 31.6092, 35.1009, 25, '', 2], ['waterTower', 31.61, 35.1, 25, 'מגדל', 1],
        ['minaret', 31.62, 35.1, 30]]))))
    const marks = await loadIsrael(place(), new AbortController().signal)
    expect(marks?.[0]).toEqual({ id: 'il-church-31.6092-35.1009', kind: 'church', lat: 31.6092, lon: 35.1009, heightM: 9,
      source: 'osm', fame: 2 })
    expect(marks?.[1]).toMatchObject({ nameHe: 'מגדל', fame: 1 })
    expect(marks?.[2]).toMatchObject({ kind: 'minaret', heightM: 9 })
    expect(marks?.[2].fame).toBeUndefined()
  })

  it('preserves tower heights from an evidence cell even under an index with no heights flag', async () => {
    const [legacyCell, evidenceCell] = cellsForStrip(place())
    vi.stubGlobal('fetch', async (input: string) => {
      if (input.includes('/crops/')) return new Response('', { status: 404 })
      if (input.endsWith('index.json')) return new Response(JSON.stringify(index({ cells: [legacyCell, evidenceCell] })))
      if (input.endsWith(`${legacyCell}.json`)) return new Response(JSON.stringify([['minaret', 31.60, 35.1, 30]]))
      return new Response(JSON.stringify({ heights: 'evidence', rows: [['church', 31.6092, 35.1009, 25], ['minaret', 31.62, 35.1, 30]] }))
    })
    const marks = await loadIsrael(place(), new AbortController().signal)
    expect(marks?.map((mark) => mark.heightM)).toEqual([HALL_M, 25, 30])
  })

  it('keeps a non-default tagged height in a legacy array cell while downgrading flat defaults to HALL_M', async () => {
    const cell = cellsForStrip(place())[0]
    vi.stubGlobal('fetch', async (input: string) => input.includes('/crops/') ? new Response('', { status: 404 })
      : input.endsWith('index.json') ? new Response(JSON.stringify(index({ cells: [cell] })))
      : new Response(JSON.stringify([['minaret', 31.62, 35.1, 30], ['minaret', 31.63, 35.1, 22], ['church', 31.61, 35.1, 18]])))
    const marks = await loadIsrael(place(), new AbortController().signal)
    expect(marks?.map((mark) => mark.heightM)).toEqual([HALL_M, 22, 18])
  })
})

describe('landmark cache version', () => {
  it('ignores a fresh v9 cache entry and reads v10 with seatCandidates instead', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v) })
    const p = place()
    const stale: Landmark = { id: 'stale-v9-minaret', kind: 'minaret', lat: p.lat, lon: p.lon, heightM: HALL_M, source: 'osm' }
    const fresh: Landmark = { id: 'fresh-v10-hall', kind: 'minaret', lat: p.lat, lon: p.lon, heightM: HALL_M, source: 'osm' }
    const seat: Landmark = { id: 'fresh-v10-seat', kind: 'synagogue', lat: p.lat + .02, lon: p.lon, heightM: HALL_M, source: 'osm' }
    const payload = (marks: Landmark[], seatCandidates: Landmark[] = []) =>
      JSON.stringify({ at: Date.now(), marks, panoramaMarks: marks, aroundMarks: marks, sceneMarks: marks, seatCandidates })
    const readHook = () => {
      let result: ReturnType<typeof useLandmarks> | null = null
      function Probe() { result = useLandmarks(p, true, false, true); return null }
      renderToStaticMarkup(createElement(Probe))
      return result!
    }
    storage.set(`shamayim:landmarks:v9:${p.id}`, payload([stale], [seat]))
    expect(readHook().marks.some((m) => m.id === stale.id)).toBe(false)
    expect(readHook().seatCandidates).toEqual([])
    expect(readHook().usesOsm).toBe(false)
    storage.set(`shamayim:landmarks:v10:${p.id}`, payload([fresh], [seat]))
    expect(readHook().marks.some((m) => m.id === fresh.id)).toBe(true)
    expect(readHook().seatCandidates.map((m) => m.id)).toEqual([seat.id])
    expect(readHook().usesOsm).toBe(true)
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
