import { afterEach, expect, it, vi } from 'vitest'
import type { Landmark } from '../data/landmarks/types'
import { loadPlaces, stubPublicFetch, worldInput } from '../test/sceneWorld'
import * as beyondSeat from './beyondSeat'
import { roshPina } from './beyondSeatFixture'
import * as skylineLayout from './drawnSkyline'
import { GLYPH_SPECS, glyphAtHeight } from './glyphSpecs'
import { DOT_R } from './layout'
import { outsideMarkBounds } from './outsideSeats'
import { heightLabelBox, hits } from './sceneClearance'
import { SCENE_W } from './sceneBox'
import type { Skyline } from './skyline'
import { buildWorld } from './world'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('uses only the budgeted seats for the height label and celestial skyline', async () => {
  stubPublicFetch()
  const loaded = (await loadPlaces([roshPina])).get(roshPina.id)!
  const input = { ...worldInput(loaded, '2026-11-17T12:00'), landmarks: [] }
  const judge = vi.spyOn(skylineLayout, 'drawnSkyline')
  const buildWith = (seatCandidates: Landmark[]) => {
    const world = buildWorld({ ...input, seatCandidates })
    return { world, skyline: judge.mock.results.at(-1)!.value as Skyline }
  }
  const baseline = buildWith([])
  const label = baseline.world.labels.height
  const { dot } = baseline.world.place3
  const badge = heightLabelBox(label, SCENE_W)
  // Put the lowest-ranked highrise under the badge and clear of the dot. The
  // five-pixel roof also gives the synthetic crest room above the skyline.
  const roofPx = 5
  const labelBase = badge.y + badge.h
  const halfTower = GLYPH_SPECS.highrise.w / 2
  const labelX = labelBase <= dot.y - DOT_R ? Math.round(label.x)
    : label.x < dot.x ? Math.min(Math.round(label.x), Math.floor(dot.x - DOT_R - halfTower))
      : Math.max(Math.round(label.x), Math.ceil(dot.x + DOT_R + halfTower))
  const labelColumn = labelX / SCENE_W
  const labelHeight = labelBase - Math.min(badge.y, baseline.skyline(labelColumn)) + roofPx
  // The other seven highrises are to the left of the dot. Their supports and spans are disjoint.
  const sites = [25, 45, 65, 85, 105, 125, 145, labelX].map((x, i) => {
    const hPx = labelHeight + (i === 7 ? 0 : 8 - i)
    const baseY = i === 7 ? labelBase : baseline.skyline(x / SCENE_W) + roofPx
    // All the synthetic seats project one metre to half a pixel at their shared distance.
    const mark: Landmark = { id: `highrise-${i}`, kind: 'highrise', source: 'osm', glyph: 'synthetic-distinct-tower',
      heightM: hPx * 2,
      lat: roshPina.lat + .02, lon: roshPina.lon + i * .0001 }
    const block = { id: `block-${i}`, x, baseY, w: glyphAtHeight('highrise', hPx).w + 1,
      h: roofPx, heightM: roofPx * 2, km: 3, seed: i }
    return { mark, block, hPx }
  })
  const seats = new Map(sites.map(({ mark, block, hPx }) =>
    [mark.id, { x: block.x, base: block.baseY, hPx, km: block.km, blockId: block.id }]))
  vi.spyOn(beyondSeat, 'beyondTowns').mockReturnValue({
    beyondTowns: sites.map(({ block }) => block),
    seatMark: (mark) => seats.get(mark.id) ?? null,
  })

  const crowd = sites.map(({ mark }) => mark)
  const budgeted = buildWith(crowd.slice(0, 2))
  const crowded = buildWith(crowd)
  const droppedAlone = buildWith(crowd.slice(-1))
  expect(crowded.world.seatPool.map(({ id }) => id)).toEqual(crowd.map(({ id }) => id))
  expect(crowded.world.marks.map(({ id }) => id)).toEqual(crowd.slice(0, 2).map(({ id }) => id))
  expect(crowded.world.labels.height).toEqual(budgeted.world.labels.height)
  const tower = droppedAlone.world.marks.find(mark => mark.id === crowd[7].id)!
  expect(tower).toBeDefined()
  const { left, right, top, bottom } = outsideMarkBounds(tower, tower.x)
  const movedBadge = heightLabelBox(droppedAlone.world.labels.height, SCENE_W)
  const boxes = JSON.stringify({ badge, movedBadge, tower: { left, right, top, bottom } })
  expect(hits([badge], left, top, right, bottom), boxes).toBe(true)
  expect(hits([movedBadge], left, top, right, bottom), boxes).toBe(false)
  expect(crowded.skyline(labelColumn)).toBe(budgeted.skyline(labelColumn))
  expect(droppedAlone.skyline(labelColumn)).toBeLessThan(crowded.skyline(labelColumn))
  const keptColumn = sites[0].block.x / SCENE_W
  expect(crowded.skyline(keptColumn)).toBe(budgeted.skyline(keptColumn))
  expect(crowded.skyline(keptColumn)).toBeLessThan(droppedAlone.skyline(keptColumn))
})
