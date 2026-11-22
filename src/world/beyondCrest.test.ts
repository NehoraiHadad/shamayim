import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { Landmark } from '../data/landmarks/types'
import { SKYLINE_STUDY_PLACES } from '../test/scenePlaces'
import { stubPublicFetch } from '../test/sceneWorld'
import { fittingBlocks, outsideFor, type OutsideFixture } from './beyondSeatFixture'
import { beyondTowns } from './beyondSeat'
import { NEIGHBOUR_MIN_TRUE_PX } from './neighbourSize'
const seatPlace = SKYLINE_STUDY_PLACES.find(p => p.id === 'ramat-gan')!
let ctx: OutsideFixture
beforeAll(async () => { stubPublicFetch(); ctx = await outsideFor(seatPlace) })
afterAll(() => vi.unstubAllGlobals())

it('clips a seated glyph to a known viable crest even when the angular height is larger', () => {
  const fit = fittingBlocks(ctx, 60, 'highrise')[0]
  const seenAt = () => ({ y: 10, groundY: 10 + NEIGHBOUR_MIN_TRUE_PX, angle: 0, groundAngle: 0 })
  const terrain = { ...ctx.loaded.terrain, seenAt,
    sightAt: () => ({ nearKm: 0, farKm: 30, farShows: false, seenAt }) }
  const { seatMark } = beyondTowns({ ...ctx.input, terrain, ground: ctx.ground, floor: ctx.floor },
    ctx.view.frame, { inPlace: () => false }, ctx.view.baseKm)
  const mark: Landmark = { id: 'crest-clipped', kind: 'highrise', heightM: 60, source: 'osm',
    lat: fit.square.lat, lon: fit.square.lon }
  expect(seatMark!(mark)?.hPx).toBeCloseTo(NEIGHBOUR_MIN_TRUE_PX, 8)
})

it('rejects a crest below the derived viability floor before it can enter selection', () => {
  const fit = fittingBlocks(ctx, 60, 'highrise')[0]
  const seenAt = () => ({ y: 10, groundY: 10 + NEIGHBOUR_MIN_TRUE_PX * .75, angle: 0, groundAngle: 0 })
  const terrain = { ...ctx.loaded.terrain, seenAt,
    sightAt: () => ({ nearKm: 0, farKm: 30, farShows: false, seenAt }) }
  const { seatMark } = beyondTowns({ ...ctx.input, terrain, ground: ctx.ground, floor: ctx.floor },
    ctx.view.frame, { inPlace: () => false }, ctx.view.baseKm)
  const mark: Landmark = { id: 'too-little-crest', kind: 'highrise', heightM: 60, source: 'osm',
    lat: fit.square.lat, lon: fit.square.lon }
  expect(seatMark!(mark)).toBeNull()
})
