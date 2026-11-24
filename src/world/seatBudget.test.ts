import { afterEach, expect, it, vi } from 'vitest'
import type { Landmark } from '../data/landmarks/types'
import { loadPlaces, stubPublicFetch, worldInput } from '../test/sceneWorld'
import * as beyondSeat from './beyondSeat'
import { roshPina } from './beyondSeatFixture'
import * as skylineLayout from './drawnSkyline'
import { GLYPH_SPECS, glyphAtHeight } from './glyphSpecs'
import { LABEL_WIDTHS } from './heightLabel'
import { DOT_R } from './layout'
import { markBoxAt } from './markGeometry'
import { TOWN_SIDE_PX } from './neighbourSeparation'
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
  const original = buildWith([])
  const label = original.world.labels.height
  const { dot } = original.world.place3
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
  const labelHeight = labelBase - Math.min(badge.y, original.skyline(labelColumn)) + roofPx
  // The other seven highrises are to the left of the dot. Their supports and spans are disjoint.
  const sites = [25, 45, 65, 85, 105, 125, 145, labelX].map((x, i) => {
    const hPx = labelHeight + (i === 7 ? 0 : 8 - i)
    const baseY = i === 7 ? labelBase : original.skyline(x / SCENE_W) + roofPx
    // All the synthetic seats project one metre to half a pixel at their shared distance.
    const mark: Landmark = { id: `highrise-${i}`, kind: 'highrise', source: 'osm', glyph: 'synthetic-distinct-tower',
      heightM: hPx * 2,
      lat: roshPina.lat + .02, lon: roshPina.lon + i * .0001 }
    const glyphWidth = glyphAtHeight('highrise', hPx).w
    const block = { id: `block-${i}`, x, baseY, w: i === 7 ? glyphWidth / 2 : glyphWidth + 1,
      h: roofPx, heightM: roofPx * 2, km: 3, seed: i }
    return { mark, block, hPx }
  })
  const seats = new Map(sites.map(({ mark, block, hPx }) =>
    [mark.id, { x: block.x, base: block.baseY, hPx, km: block.km, blockId: block.id }]))
  const towns = vi.spyOn(beyondSeat, 'beyondTowns').mockReturnValue({
    beyondTowns: sites.map(({ block }) => block),
    seatMark: (mark) => seats.get(mark.id) ?? null,
  })

  const baseline = buildWith([])
  const crowd = sites.map(({ mark }) => mark)
  const budgeted = buildWith(crowd.slice(0, 2))
  const crowded = buildWith(crowd)
  const droppedAlone = buildWith(crowd.slice(-1))
  expect(crowded.world.seatPool.map(({ id }) => id)).toEqual(crowd.map(({ id }) => id))
  expect(crowded.world.marks.map(({ id }) => id)).toEqual(crowd.slice(0, 2).map(({ id }) => id))
  expect(budgeted.world.labels.height).toEqual(baseline.world.labels.height)
  expect(crowded.world.labels.height).toEqual(budgeted.world.labels.height)
  const tower = droppedAlone.world.marks.find(mark => mark.id === crowd[7].id)!
  expect(tower).toBeDefined()
  const { left, right, top, bottom } = markBoxAt(tower, tower.x)
  const movedBadge = heightLabelBox(droppedAlone.world.labels.height, SCENE_W)
  const boxes = JSON.stringify({ badge, movedBadge, tower: { left, right, top, bottom } })
  expect(hits([badge], left, top, right, bottom), boxes).toBe(true)
  // The lowest-ranked synthetic block is half the glyph width, so it cannot receive the spire at any supported width.
  expect(droppedAlone.world.labels.height).toEqual(baseline.world.labels.height)
  expect(crowded.skyline(labelColumn)).toBe(budgeted.skyline(labelColumn))
  expect(droppedAlone.skyline(labelColumn)).toBeLessThan(crowded.skyline(labelColumn))
  const keptColumn = sites[0].block.x / SCENE_W
  expect(crowded.skyline(keptColumn)).toBe(budgeted.skyline(keptColumn))
  expect(crowded.skyline(keptColumn)).toBeLessThan(droppedAlone.skyline(keptColumn))

  // Fit even at the narrow solver viewport, with one extra CSS pixel beyond both seating seams.
  const last = sites[7].block
  const wide = { ...last, w: (tower.w + 2 * TOWN_SIDE_PX + 1) * SCENE_W / LABEL_WIDTHS[0] }
  towns.mockReturnValue({ beyondTowns: [...sites.slice(0, 7).map(({ block }) => block), wide],
    seatMark: (mark) => seats.get(mark.id) ?? null })
  const wideBudgeted = buildWith(crowd.slice(0, 2)).world
  const wideCrowded = buildWith(crowd).world
  const wideDroppedAlone = buildWith(crowd.slice(-1)).world
  expect(wideCrowded.seatPool.map(({ id }) => id)).toContain(tower.id)
  expect(wideCrowded.marks.map(({ id }) => id)).not.toContain(tower.id)
  expect(wideDroppedAlone.marks.map(({ id }) => id)).toEqual([tower.id])
  expect(wideDroppedAlone.labels.height).not.toEqual(wideBudgeted.labels.height)
  expect(wideCrowded.labels.height).toEqual(wideBudgeted.labels.height)
})
