import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { withPlaceHomes } from '../data/landmarks/placeMarks'
import type { Landmark } from '../data/landmarks/types'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { HALL_M } from '../data/landmarks/worship'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch } from '../test/sceneWorld'
import { findUnbuiltVisibleSquares, outsideFor, roshPina, type OutsideFixture } from './beyondSeatFixture'
import { placeOf } from './place'
import { SCENE_W } from './sceneBox'

let ctx: OutsideFixture

beforeAll(async () => {
  stubPublicFetch()
  ctx = await outsideFor(roshPina)
})
afterAll(() => vi.unstubAllGlobals())

it('keeps the own portrait set unchanged when extra own settlement candidates are present in the source', async () => {
  const unbuilt = findUnbuiltVisibleSquares(ctx, 30, 8)
  expect(unbuilt.length).toBe(8)
  // Eight tall marks outside the place fill all 8 shortlist slots; one own synagogue takes the synagogue portrait reserve.
  const fillers: Landmark[] = unbuilt.map((spot, i) => ({
    id: `filler-${i}`, kind: 'waterTower', source: 'osm', heightM: 45, nameHe: `מגדל ${i}`, fame: 2, ...spot,
  }))
  const ownFirst: Landmark = { id: 'own-syn-1', kind: 'synagogue', source: 'osm', heightM: 16, nameHe: 'בית כנסת א', fame: 2,
    lat: roshPina.lat, lon: roshPina.lon + .001 }
  // A second own synagogue (lower-scoring, excluded by the pre-round-4 shortlist) sits inside the place at a distinct x.
  const ownExtra: Landmark = { id: 'own-syn-2', kind: 'synagogue', source: 'osm', heightM: HALL_M, nameHe: 'בית כנסת ב',
    lat: roshPina.lat, lon: roshPina.lon - .002 }
  const base = [...fillers, ownFirst]

  const signal = new AbortController().signal
  const withoutExtra = await loadLandmarkSource(roshPina, signal, { israel: async () => base })
  const withExtra = await loadLandmarkSource(roshPina, signal, { israel: async () => [...base, ownExtra] })

  expect(withExtra.sceneMarks.map((m) => m.id)).toEqual(withoutExtra.sceneMarks.map((m) => m.id))
  expect(withExtra.seatCandidates.map((m) => m.id)).toContain(ownExtra.id)

  const portraitIds = (source: Awaited<ReturnType<typeof loadLandmarkSource>>) =>
    placeOf({ ...ctx.input, landmarks: withPlaceHomes(roshPina, source.sceneMarks),
      seatCandidates: source.seatCandidates }).marks.filter((mark) => mark.portrait).map((mark) => mark.id)

  expect(portraitIds(withoutExtra)).toContain(ownFirst.id)
  expect(portraitIds(withExtra)).toEqual(portraitIds(withoutExtra))
})

it('ignores own and non-settlement marks passed via seatCandidates in marksOf', () => {
  const [spot] = findUnbuiltVisibleSquares(ctx, 30, 1)
  expect(spot).toBeDefined()
  const ownFamous: Landmark = { id: 'carried-own', kind: 'minaret', source: 'osm', heightM: 28,
    nameHe: 'מסגד מקומי', fame: 2, lat: roshPina.lat, lon: roshPina.lon + .0015 }
  const beyondTower: Landmark = { id: 'carried-non-settlement', kind: 'waterTower', source: 'osm', heightM: 35,
    nameHe: 'מגדל מים', fame: 2, ...spot }
  const baseline = placeOf({ ...ctx.input, seatCandidates: [] }).marks
  const withCarried = placeOf({ ...ctx.input, seatCandidates: [ownFamous, beyondTower] }).marks
  expect(withCarried.map((m) => m.id)).toEqual(baseline.map((m) => m.id))
})

it('keeps bundled city portraits identical with seatCandidates while seating Jerusalem beyond 9 m hall', async () => {
  const cities = SCENE_PLACES.filter((p) => ['tel-aviv', 'haifa', 'jerusalem'].includes(p.id))
  const loaded = await loadPlaces(cities)
  for (const place of cities) {
    const data = loaded.get(place.id)!
    expect(data.seatCandidates?.length ?? 0).toBeGreaterThan(0)
    const sceneIds = new Set(data.landmarks.map((m) => m.id))
    expect(data.seatCandidates!.every((m) => !sceneIds.has(m.id))).toBe(true)
    const baseInput = { ...data, width: SCENE_W, elevation: data.terrain.heightNear?.(0, 0) ?? 0 }
    const without = placeOf({ ...baseInput, seatCandidates: [] }).marks
    const withSeats = placeOf(baseInput).marks
    // Own portrait set is untouched by seatCandidates for every city.
    expect(withSeats.filter((m) => m.portrait).map((m) => m.id), place.id)
      .toEqual(without.filter((m) => m.portrait).map((m) => m.id))
    if (place.id === 'jerusalem') {
      const gained = withSeats.filter((m) => !without.some((w) => w.id === m.id))
      expect(gained.some((m) => !m.portrait && m.kind === 'minaret' && Boolean(m.seatBlockId))).toBe(true)
    }
  }
})
