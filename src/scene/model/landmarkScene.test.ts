import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { glyphAtHeight } from '../../world/glyphSpecs'
import type { WorldMark } from '../../world/markGeometry'
import { roshPina } from '../../world/beyondSeatFixture'
import type { OutsideView, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { sceneModel } from '.'

let base: WorldState
beforeAll(async () => {
  stubPublicFetch()
  const loaded = (await loadPlaces([roshPina])).get(roshPina.id)!
  base = buildWorld(worldInput(loaded, '2026-11-17T12:00'))
})
afterAll(() => vi.unstubAllGlobals())

function fixture(plane: 'far' | 'near', trueHeightPx: number): WorldState {
  const block = { id: 'landmark-town', x: 80, w: 80, baseY: 100, h: 4, km: 11, heightM: 16, seed: 1 }
  // Physical screen heights are synthetic; omit heightM so the receiver uses this independent source evidence.
  const mark = { id: 'famous-castle', kind: 'castle', glyphKind: 'castle', named: true, plane,
    x: 80, base: 100, hPx: trueHeightPx, ...glyphAtHeight('castle', trueHeightPx), trueHeightPx,
    sightKm: 12, km: 12, townFootprint: false,
    ...(plane === 'near' ? { seatBlockId: block.id, seatRank: 1 } : {}) } as WorldMark
  const view = base.place3 as OutsideView
  const ridge = { points: [[0, 120], [375, 120]] as [number, number][], distanceKm: [1, 1] }
  return { ...base, marks: plane === 'far' ? [mark] : [],
    seatPool: plane === 'near' ? [{ ...mark, seatBlockId: block.id, seatRank: 1 }] : [],
    terrain: { ...base.terrain, near: ridge, far: ridge, back: undefined },
    farCities: { ...base.farCities, shapes: { mass: [], blocks: [], lights: [] } },
    place3: { ...view, beyond: [], land: null, beyondTowns: plane === 'near' ? [block] : [],
      skyline: { ...view.skyline, boxes: [], towers: [] }, trees: [] } }
}

it.each([
  { plane: 'far', truePx: 30, drawnPx: 16 }, { plane: 'near', truePx: 30, drawnPx: 16 },
  { plane: 'far', truePx: 1, drawnPx: 6 }, { plane: 'near', truePx: 1, drawnPx: 6 },
] as const)('clamps a $plane famous source from $truePx to $drawnPx px through sceneModel',
  ({ plane, truePx, drawnPx }) => {
    const world = fixture(plane, truePx)
    for (const width of [375, 1280]) for (const dpr of [1, 2]) {
      const model = sceneModel(world, { width, skyHeight: 0, landTop: 0, landHeight: 128, dpr })
      const glyphs = model.layers.flatMap(layer => layer.kind === 'marks' ? layer.glyphs
        : layer.kind === 'outside' ? layer.items.flatMap(i => i.kind === 'mark' ? [i.glyph] : []) : [])
      expect(glyphs).toHaveLength(1)
      const glyph = glyphs[0]
      expect(glyph.sourceId).toBe('famous-castle')
      expect(glyph.nonOwn).toBe(true)
      expect(glyph.trueHeightPx).toBe(truePx)
      expect(glyph.h * glyph.scale).toBe(drawnPx)
      expect(glyph.factor).toBe(drawnPx / truePx)
      expect(glyph.w).toBeCloseTo(16 * drawnPx / 9.5, 10)
      expect(glyph.baseMode).toBe('foot')
      expect(glyph.supportId).toBe(plane === 'near' ? 'landmark-town' : undefined)
      expect(model.layers.find(layer => layer.kind === (plane === 'near' ? 'outside' : 'marks'))).toBeDefined()
    }
  })
