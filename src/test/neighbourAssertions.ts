import { expect } from 'vitest'
import { HOME_GAP_PX, MAX_NEIGHBOUR_SLIDE_PX, TOWN_SIDE_PX } from '../scene/model/neighbourPlacement'
import type { GlyphDesc, LayerOf } from '../scene/model/types'
import type { WorldMark } from '../world/markGeometry'
import { SCENE_W } from '../world/sceneBox'
import type { WorldState } from '../world/types'
import { assertRidges } from './drawnGeometryAssertions'
import { tonesAt } from '../scene/model/marks'

const hazeCache = new WeakMap<WorldState, Map<string, number>>()
function hazeDistances(world: WorldState) {
  let cached = hazeCache.get(world)
  if (!cached) {
    cached = new Map()
    for (let km = 0; km <= 100; km += .5) cached.set(JSON.stringify(tonesAt(world, km)), world.air.fade(km))
    hazeCache.set(world, cached)
  }
  return cached
}

/** Derive home and source support from final painted items, independently of the placement helpers. */
export function assertNeighbour(world: WorldState, width: number, layer: LayerOf<'outside'> | undefined,
  glyph: GlyphDesc, mark: WorldMark, hint: string, towns?: LayerOf<'farCities'>) {
  if (world.place3.kind !== 'outside') throw new Error(hint)
  const view = world.place3, sx = width / SCENE_W
  const home = layer?.items.flatMap(item => item.kind === 'box' && !item.beyond
    ? [{ left: item.x - item.w / 2, right: item.x + item.w / 2, haze: layer.tiers[item.tier] }]
    : item.kind === 'tower' && !view.beyond.some(tower => tower.seed === item.seed)
      ? [{ left: item.x - item.w / 2, right: item.x + item.w / 2, haze: layer.tiers[item.tier] }] : []) ?? []
  const left = glyph.x - glyph.w / 2, right = glyph.x + glyph.w / 2
  const original = mark.x * sx, delta = glyph.x - original
  expect(Math.abs(delta), hint).toBeLessThanOrEqual(MAX_NEIGHBOUR_SLIDE_PX + 1e-6)
  if (home.length) {
    const lo = Math.min(...home.map(b => b.left)), hi = Math.max(...home.map(b => b.right))
    expect(Math.max(lo - right, left - hi) + 1e-6, hint).toBeGreaterThanOrEqual(HOME_GAP_PX)
    expect(delta * Math.sign(original - (lo + hi) / 2), hint).toBeGreaterThanOrEqual(-1e-6)
    const fade = hazeDistances(world)
    for (const roof of home) expect(world.air.fade(glyph.hazeKm!) + 1e-9, hint)
      .toBeGreaterThanOrEqual(fade.get(JSON.stringify(roof.haze))!)
  }
  // Infer the requirement from the source kind, independently of the renderer's town classification.
  if (['minaret', 'church', 'synagogue', 'homes', 'westernWall', 'babShrine'].includes(mark.glyphKind)) {
    expect(glyph.town, hint).toBe(true)
  }
  if (glyph.town) {
    expect(glyph.supportId, hint).toBeTruthy()
    if (mark.plane === 'near') {
      const block = view.beyondTowns?.find(b => b.id === glyph.supportId)
      expect(block, hint).toBeDefined()
      const drawn = layer?.items.find(item => item.kind === 'box' && item.beyond && item.seed === block!.seed
        && item.x === block!.x * sx && item.foot === block!.baseY)
      expect(drawn?.kind, hint).toBe('box')
      if (drawn?.kind !== 'box') throw new Error(hint)
      expect(glyph.base, hint).toBeCloseTo(drawn.foot, 6)
      expect(drawn.top, hint).toBeLessThan(glyph.base)
      expect(left - (drawn.x - drawn.w / 2) + 1e-6, hint).toBeGreaterThanOrEqual(TOWN_SIDE_PX)
      expect(drawn.x + drawn.w / 2 - right + 1e-6, hint).toBeGreaterThanOrEqual(TOWN_SIDE_PX)
    } else {
      const owner = world.farCities.footprints?.get(mark.farCellId!)
      expect(owner, hint).toBeDefined()
      expect(glyph.supportId, hint).toBe(`far-town:${owner!.townId}`)
      const strips = towns?.tiers.flatMap(t => t.mass.flatMap(part => part.boxes))
        .filter(b => b.townId === owner!.townId && b.y < glyph.base && b.y + b.h >= glyph.base - 1e-7) ?? []
      // Every portion of the padded foot must touch its own final painted town mass.
      const runs = strips.map(b => [b.x, b.x + b.w]).sort((a, b) => a[0] - b[0])
      let covered = left - TOWN_SIDE_PX
      for (const [lo, hi] of runs) if (lo <= covered + 1e-7 && hi > covered) covered = hi
      expect(covered + 1e-7, hint).toBeGreaterThanOrEqual(right + TOWN_SIDE_PX)
    }
  }
  const pad = glyph.town ? TOWN_SIDE_PX : 0
  assertRidges(world, { ...glyph, w: glyph.w + 2 * pad }, sx, mark.km, mark.plane === 'near', !!glyph.town, hint)
}
