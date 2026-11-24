import { expect, it, vi } from 'vitest'
import { sceneModel } from '../scene/model'
import { glyphBox } from '../test/heightLabelDiagnostics'
import { loadPlaces, stubPublicFetch, worldInput } from '../test/sceneWorld'
import { roshPina } from './beyondSeatFixture'
import { DOT_R } from './layout'
import type { WorldMark } from './markGeometry'
import * as marks from './marks'
import { LANDMARK_MAX_PX, neighbourSize } from './neighbourSize'
import { heightLabelBox } from './sceneClearance'
import { SCENE_W } from './sceneBox'
import { buildWorld } from './world'

it('moves the ridge-level badge away from the visible top of a far landmark', async () => {
  stubPublicFetch()
  try {
    const loaded = (await loadPlaces([roshPina])).get(roshPina.id)!
    const original = worldInput(loaded, '2026-11-17T12:00')
    // A level, bare ridge puts the dot on the crest and isolates the visible castle top.
    const ridge = 90
    const nearPoints: [number, number][] = [[0, ridge], [SCENE_W, ridge]]
    const terrain = { ...original.terrain, centerLeft: '50%', nearPoints, nearElevations: undefined,
      heightNear: undefined, water: [], sightAt: () => ({ nearKm: 3, farKm: 30, farShows: false }) }
    const input = { ...original, terrain, landmarks: [], seatCandidates: [], city: null, far: null,
      bounds: null, cover: null, waterMask: null, forecast: { ...original.forecast, elevation: 1000 } }
    const baseline = buildWorld(input)
    const badgeBefore = heightLabelBox(baseline.labels.height, SCENE_W)
    const size = neighbourSize('castle', LANDMARK_MAX_PX, true)!
    // The body clears the dot by 1 px horizontally and its top rises into the badge.
    const x = SCENE_W / 2 + DOT_R + size.w / 2 + 1
    const sourceGroundY = ridge + DOT_R
    const mark: WorldMark = { ...size, id: 'ridge-castle', glyph: 'castle', glyphKind: 'castle', kind: 'castle',
      layer: 'far', plane: 'far', x, xPct: 100 * x / SCENE_W, bearingX: x, base: sourceGroundY, baseY: sourceGroundY,
      sourceGroundY, sourceTopY: ridge - LANDMARK_MAX_PX, hPx: LANDMARK_MAX_PX, sightKm: 16, km: 16,
      lights: 0, tall: false, dy: -16, named: true, townFootprint: false }
    // Supply projected source evidence at the mark boundary. Both badge solving and drawing use the full world.
    vi.spyOn(marks, 'marksOf').mockReturnValue({ marks: [mark], seatPool: [] })
    const world = buildWorld(input)
    const draw = (at: typeof world) => sceneModel(at, { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 })
      .layers.find(layer => layer.kind === 'marks')?.glyphs.find(glyph => glyph.sourceId === mark.id)
    const unobscured = draw({ ...world, labels: { ...world.labels, height: { ...world.labels.height, x: -SCENE_W, backed: false } } })
    expect(unobscured?.baseMode).toBe('ridge')
    const top = glyphBox(unobscured!)
    expect(top.top).toBeGreaterThan(badgeBefore.y)
    expect(top.top).toBeLessThan(badgeBefore.y + badgeBefore.h)
    expect(top.left).toBeLessThan(badgeBefore.x + badgeBefore.w)
    expect(top.right).toBeGreaterThan(badgeBefore.x)
    expect(world.labels.height).not.toEqual(baseline.labels.height)

    const glyph = draw(world)
    expect(glyph?.baseMode).toBe('ridge')
    const box = glyphBox(glyph!)
    const badge = heightLabelBox(world.labels.height, SCENE_W)
    // The clearance predicate permits edge contact. Allow only floating-point error around zero overlap.
    const gap = Math.max(box.left - badge.x - badge.w, badge.x - box.right,
      box.top - badge.y - badge.h, badge.y - box.bottom)
    expect(gap).toBeGreaterThanOrEqual(-1e-6)
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})
