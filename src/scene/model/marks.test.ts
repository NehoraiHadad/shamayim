import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { groundFn } from '../../data/landmarks/seat'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { GLYPH_SPECS } from '../../world/glyphSpecs'
import { SHEET_CLEAR, VISIBLE_BOTTOM } from '../../world/layout'
import type { WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'
import { tonesAt } from './marks'
import { labOf } from './tone'
import type { LayerOf, SceneBox } from './types'

/**
 * Stage C4 (docs/design/CANVAS-SCENE-PLAN.md §3, tier 1): the marks, the landmarks and the village (seen from outside
 * since C5, by the one builder: `outside.test.ts` covers its order, depth, density and zones).
 */
const TIMES: LocalTime[] = ['2026-11-17T08:00', '2026-11-17T12:00', '2026-11-17T16:30', '2026-11-17T21:00']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const PORTRAITS = ['shadmot-mehola', 'rosh-pina', 'ein-gedi']
let loaded: Map<string, LoadedPlace>
const worlds = new Map<string, WorldState>()

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

function worldAt(id: string, at: LocalTime = TIMES[1]) {
  const key = `${id}@${at}`
  let world = worlds.get(key)
  if (!world) worlds.set(key, world = buildWorld(worldInput(loaded.get(id)!, at)))
  return world
}

describe.each(SCENE_PLACES)('marks: $id', ({ id }) => {
  it('seats every mark on the land it stands on', () => {
    const world = worldAt(id)
    const near = groundFn(world.terrain.near.points.map(([x, y]) => [x, y]), 375)
    const far = groundFn(world.terrain.far.points.map(([x, y]) => [x, y]), 375)
    for (const mark of world.marks) {
      const spec = GLYPH_SPECS[mark.glyphKind]
      if (mark.plane === 'plain') continue
      const ground = mark.plane === 'near' ? near : far
      if (spec.field && world.place3.kind === 'outside' && mark.portrait) {
        // Seen from outside (C5b), a field of the place lies on its own row's ground, at least a px down, over the sheet.
        expect(mark.depth!, mark.id).toBeGreaterThanOrEqual(1)
        expect(mark.base, mark.id).toBeLessThanOrEqual(VISIBLE_BOTTOM + 0.01)
        continue
      }
      if (spec.field) {
        // A field's first row lies on the face, under the crest.
        expect(mark.depth!, mark.id).toBeGreaterThanOrEqual(1)
        const under = Math.min(...[0, 0.25, 0.5, 0.75, 1].map((t) => near(mark.x - mark.w / 2 + t * mark.w)))
        expect(mark.base - under, mark.id).toBeGreaterThanOrEqual(mark.depth! - 0.01)
        expect(mark.base - under, mark.id).toBeLessThanOrEqual(mark.depth! + 0.01)
        continue
      }
      const low = Math.max(ground(mark.x - mark.w / 2), ground(mark.x + mark.w / 2))
      if (world.place3.kind === 'outside' && mark.portrait) {
        // The outside view (C5b): on its own row's ground, never floating over the land that stands where it is drawn (the
        // ridge line, or the place's own ground where it rises over it), never under the sheet's edge.
        const land = world.place3.land?.top
        const i = land ? Math.round(mark.x - land[0][0]) : -1
        const surface = land && i >= 0 && i < land.length ? Math.min(near(mark.x) + 1, land[i][1] + 1) : near(mark.x) + 1
        expect(mark.base - surface, mark.id).toBeGreaterThanOrEqual(-0.51)
        expect(mark.base, mark.id).toBeLessThanOrEqual(VISIBLE_BOTTOM - SHEET_CLEAR + 0.01)
        continue
      }
      // On the line: its downhill corner on the ground (1 px into it); a mark of the place may be lifted ≤ 6 px off the
      // sheet edge; a mark in front of the line stands down the face (≤ 12 px).
      expect(mark.base - (low + 1), mark.id).toBeGreaterThanOrEqual(-6.01)
      expect(mark.base - (low + 1), mark.id).toBeLessThanOrEqual(mark.plane === 'near' ? 12 : 0.5)
    }
  })

  it('lights every glyph from the world light’s side, its shadow away from it', () => {
    for (const at of TIMES) {
      const world = worldAt(id, at)
      for (const layer of sceneModel(world, BOX).layers) {
        if (layer.kind !== 'marks') continue
        if (Math.abs(world.light.across) > 0.05) expect(Math.sign(layer.shine.cast.dx)).toBe(-Math.sign(world.light.across))
      }
    }
  })

  it('makes a landmark only of a named mark', () => {
    const world = worldAt(id)
    const { landmarks, seatCandidates = [] } = loaded.get(id)!
    for (const mark of world.marks) {
      if (!mark.named && !mark.landmark) continue
      const source = [...landmarks, ...seatCandidates].find((l) => l.id === mark.id)!
      expect(Boolean(source.nameHe), mark.id).toBe(true)
    }
  })
})

describe.each(PORTRAITS)('village seen from outside: %s', (id) => {
  const outside = (world: WorldState) => sceneModel(world, BOX).layers.find((l) => l.kind === 'outside') as LayerOf<'outside'>

  it('builds its houses from its own built cells, low ones as houses with roofs', () => {
    const world = worldAt(id)
    if (world.place3.kind !== 'outside') throw new Error('not seen from outside')
    const houses = outside(world).items.filter((i) => i.kind === 'box' && i.roof !== null)
    expect(houses.length).toBeGreaterThan(8)
    expect(world.place3.fabric).toBe('cover')
  })

  it('takes its roofs only from roof evidence, else mixed', () => {
    const world = worldAt(id)
    if (world.place3.kind !== 'outside') throw new Error('not seen from outside')
    const houses = outside(world).items.flatMap((i) => i.kind === 'box' && i.roof ? [i.roof] : [])
    const tiles = houses.filter((r) => r === 'tile').length / houses.length
    if (world.place3.roofs === 'flat') expect(tiles).toBe(0)
    else if (world.place3.roofs === 'tile') expect(tiles).toBe(1)
    else {
      expect(tiles).toBeGreaterThan(0.2)
      expect(tiles).toBeLessThan(0.8)
    }
  })

  it('lights its windows by night and not by day', () => {
    expect(outside(worldAt(id, TIMES[1])).shine.windows).toBe(0)
    expect(outside(worldAt(id, TIMES[3])).shine.windows).toBeGreaterThan(0.2)
  })
})

describe('the portrait rule', () => {
  it('draws nothing for a place with no houses of its own', () => {
    const layer = sceneModel(worldAt('ramon-crater'), BOX).layers.find((l) => l.kind === 'outside') as LayerOf<'outside'> | undefined
    expect((layer?.items ?? []).filter((i) => i.kind === 'box').length).toBe(0)
  })
})

describe('icons and glyph tones', () => {
  it('carries a glyph toward the air with distance, and every icon takes the world’s light', () => {
    const world = worldAt('jerusalem', '2026-11-17T08:00')
    const near = labOf(tonesAt(world, 1).wall), far = labOf(tonesAt(world, 25).wall)
    const air = labOf(tonesAt(world, 1).mist)
    expect(Math.abs(far.l - air.l)).toBeLessThan(Math.abs(near.l - air.l))
    const icons = sceneModel(world, BOX).layers.flatMap((l) => l.kind === 'marks' ? l.glyphs
      : l.kind === 'outside' ? l.items.flatMap((i) => i.kind === 'mark' ? [i.glyph] : []) : [])
      .filter((g) => ['westernWall', 'chordsBridge', 'azrieli', 'babShrine'].includes(g.kind))
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) expect(icon.hand).toBe(1)
  })

  it('keeps the layers’ shapes through a scrub; only their light moves', () => {
    const keys = TIMES.map((at) => sceneModel(worldAt('rosh-pina', at), BOX).layers.filter((l) => l.kind === 'marks'
      || l.kind === 'outside'))
    for (const layers of keys.slice(1)) {
      expect(layers.map((l) => l.key)).toEqual(keys[0].map((l) => l.key))
      // The same extent at every hour: a resized layer would be repainted whole.
      expect(layers.map((l) => l.bounds)).toEqual(keys[0].map((l) => l.bounds))
    }
    expect(new Set(keys.map((layers) => layers.map((l) => l.light?.key).join())).size).toBe(TIMES.length)
  })
})
