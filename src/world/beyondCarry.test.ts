import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { Landmark } from '../data/landmarks/types'
import { SKYLINE_STUDY_PLACES } from '../test/scenePlaces'
import { stubPublicFetch } from '../test/sceneWorld'
import { fittingBlocks, findUnbuiltVisibleSquares, outsideFor, type OutsideFixture } from './beyondSeatFixture'
const seatPlace = SKYLINE_STUDY_PLACES.find(p => p.id === 'ramat-gan')!
let ctx: OutsideFixture
beforeAll(async () => { stubPublicFetch(); ctx = await outsideFor(seatPlace) })
afterAll(() => vi.unstubAllGlobals())

import { withPlaceHomes } from '../data/landmarks/placeMarks'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { placeOf } from './place'

it('carries a legible 60 m hall through loadLandmarkSource past unseatable tall minarets', async () => {
  const heightM = 60 // Clears the shared viability floor; the taller decoys still outrank it.
  const fit = fittingBlocks(ctx, heightM, 'minaret')[0]
  expect(fit).toBeDefined()
  const unbuilt = findUnbuiltVisibleSquares(ctx, 120, 12)
  expect(unbuilt.length).toBeGreaterThanOrEqual(10)
  // Twelve tall 120 m minarets on undrawn squares outrank the legible hall and fill all 8 shortlist slots + the
  // minaret reserve.
  const decoys: Landmark[] = unbuilt.map((spot, i) => ({
    id: `decoy-tall-${i}`, kind: 'minaret', source: 'osm', heightM: 120, nameHe: `Synthetic decoy ${i}`, ...spot,
  }))
  const hall: Landmark = { id: 'seated-hall', kind: 'minaret', source: 'osm', heightM,
    lat: fit.square.lat, lon: fit.square.lon }
  // Nine own decoys occupy the top-eight pool and its extra portrait minaret reserve; none can take a beyond seat.
  const reserves: Landmark[] = Array.from({ length: 9 }, (_, i) => ({ id: `portrait-reserve-${i}`, kind: 'minaret',
    source: 'osm',
    heightM: 160, lat: seatPlace.lat, lon: seatPlace.lon, nameHe: 'Synthetic own reserve' }))
  const source = await loadLandmarkSource(seatPlace, new AbortController().signal, {
    israel: async () => [...reserves, ...decoys, hall],
  })
  // Proves the shortlist (top 8 + 1 minaret reserve) stays unchanged and excludes the shorter hall.
  expect(source.panoramaMarks.some((mark) => mark.id === hall.id)).toBe(false)
  expect(source.sceneMarks.some((mark) => mark.id === hall.id)).toBe(false)
  // Extra skyline settlement marks travel separately in seatCandidates: decoys fail seatMark, and the shorter hall
  // seats.
  expect(source.seatCandidates.some((mark) => mark.id === hall.id)).toBe(true)
  const placed = placeOf({ ...ctx.input, landmarks: withPlaceHomes(seatPlace, source.sceneMarks),
    seatCandidates: source.seatCandidates })
  expect(placed.marks.find((mark) => mark.id === hall.id)).toMatchObject({ x: fit.x, seatBlockId: fit.block.id })
})

