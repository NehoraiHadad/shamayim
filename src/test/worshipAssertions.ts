import { LEGIBLE_PX, MAX_EXAGGERATION } from '../world/neighbourSize'
import { assertNeighbour } from './neighbourAssertions'
import { expect } from 'vitest'
import { squareCentre } from '../data/city/grid'
import { hashId } from '../data/landmarks/hash'
import { distanceOf, offsetKm } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import type { SceneTerrain } from '../data/terrain/terrain'
import { outsideDepth, projectedHeight, visibleOverRidge, HEIGHT_TOLERANCE_PX } from './drawnGeometryAssertions'
import { tonesAt } from '../scene/model/marks'
import { SCENE_W } from '../world/sceneBox'
import { outsideMass } from '../scene/model/outside'
import type { SceneBox, SceneModel } from '../scene/model/types'
import type { BeyondBlock, WorldState } from '../world/types'

/** C9's recorded cameras and bundled raster yield these roofs above the shared 1 px angular-and-crest floor. */
export const QUALIFYING_TOWN_ROOFS: Readonly<Record<string, number>> = { 'ramat-gan': 244, 'tel-aviv': 14, haifa: 2 }

export function assertTownScale(block: BeyondBlock, world: WorldState, terrain: SceneTerrain) {
  if (world.place3.kind !== 'outside') throw new Error('No outside frame')
  const [cell, col, row] = block.id.split(':')
  const { dx, dy } = offsetKm(world.place, squareCentre({ cell, col: Number(col), row: Number(row) }))
  const km = Math.hypot(dx, world.place3.frame.eyeN - dy)
  const angularPx = projectedHeight(block.heightM, km, block.baseY, world.terrain.horizonY)
  const expected = Math.min(angularPx, visibleOverRidge(terrain, dx, dy, block.heightM))
  expect(block.h).toBeGreaterThanOrEqual(expected - HEIGHT_TOLERANCE_PX)
  expect(block.h).toBeLessThanOrEqual(expected + HEIGHT_TOLERANCE_PX)
}

/** Every evidenced far structure keeps its physical height, clipped only by the visible terrain portion. */
export function assertFarScale(world: WorldState) {
  for (const block of world.farCities.shapes.blocks) {
    expect(block.heightM).toBeDefined()
    const h = projectedHeight(block.heightM!, block.km, block.base, world.terrain.horizonY)
    expect(block.h).toBeCloseTo(Math.min(h, block.visiblePx ?? Infinity), 6)
    expect(block.h).toBeGreaterThanOrEqual(1)
  }
}

/** Compare the final painted glyphs with their source geometry and the actual outside layer. */
export function assertDrawnSeats(world: WorldState, box: SceneBox, model: SceneModel, sources: ReadonlyMap<string,
  Landmark>, terrain?: SceneTerrain) {
  if (world.place3.kind !== 'outside') return { seated: 0, unseated: 0, raster: 0 }
  const sx = box.width / SCENE_W
  const view = world.place3
  const outside = model.layers.find((layer) => layer.kind === 'outside')
  const far = model.layers.find((layer) => layer.kind === 'marks')
  const bySeed = new Map([...world.marks, ...world.seatPool].map((mark) => [hashId(mark.id), mark]))
  const towns = model.layers.find(layer => layer.kind === 'farCities')
  const outsideMasses = outsideMass(world, box, model.clear)
  // Deliberately reimplement farMasses: comparing against the production helper would share its mistakes.
  // Missing source km falls back to the painted tier: the assertion stays conservative for incomplete evidence,
  // whereas production farMasses omits such boxes instead of assigning a potentially false occlusion depth.
  const farMasses = towns?.tiers.flatMap(tier => [
    ...tier.blocks.map(b => ({ left: b.x, right: b.x + b.w, top: b.base - b.h, km: b.km, id:
      undefined as string | undefined })),
    ...tier.mass.flatMap(({ boxes }) => boxes.map(b => ({ left: b.x, right: b.x + b.w, top: b.y, km: b.km ?? tier.km,
      id: b.townId === undefined ? undefined : `far-town:${b.townId}` }))),
  ]) ?? []
  const glyphs = [...(outside?.items.flatMap(item => item.kind === 'mark' ? [item.glyph] : []) ?? []),
    ...(far?.glyphs ?? [])]
  let seated = 0, unseated = 0
  for (const glyph of glyphs) {
    const mark = bySeed.get(glyph.seed)
    if (!mark || (mark.seatBlockId === undefined && mark.sightKm === undefined)) continue
    const hint = `${world.place.id}@${box.width} ${mark.id}`
    const landmark = sources.get(mark.id)!
    expect(landmark, hint).toBeDefined()
    const { dx, dy } = offsetKm(world.place, landmark)
    const seat = view.beyondTowns?.find(block => block.id === mark.seatBlockId)
    const inOutside = mark.plane === 'near'
    const distance = inOutside ? Math.hypot(dx, view.frame.eyeN - dy) : distanceOf(world.place, landmark)
    const crest = terrain ? visibleOverRidge(seat ? terrain : { ...terrain,
      nearPoints: world.terrain.near.points.map(([x, y]) => [x, y]) }, dx, dy, landmark.heightM) :
        mark.crestPx ?? Infinity
    const expected = Math.min(projectedHeight(landmark.heightM, distance, glyph.base, world.terrain.horizonY), crest)
    const height = glyph.h * glyph.scale
    expect(glyph.trueHeightPx, hint).toBeCloseTo(expected, 6)
    expect(height, hint).toBeCloseTo(Math.max(LEGIBLE_PX, expected), 6)
    expect(glyph.factor, hint).toBeCloseTo(height / expected, 6)
    expect(glyph.factor, hint).toBeLessThanOrEqual(MAX_EXAGGERATION)
    expect(height, hint).toBeGreaterThanOrEqual(LEGIBLE_PX)
    expect(glyph.trueDistanceKm, hint).toBe(mark.km)
    const tier = Math.max(0, Math.min(18, Math.floor(Math.log(mark.km / 2) / Math.log(1.22))))
    const haze = 2 * 1.22 ** tier * 1.1
    expect(glyph.hazeKm, hint).toBeCloseTo(haze, 8)
    expect(glyph.tones, hint).toEqual(tonesAt(world, haze))
    if (inOutside) expect(mark.km, hint).toBeCloseTo(outsideDepth(world, dx, dy), 8)
    const pad = glyph.town ? 1 : 0
    const left = glyph.x - glyph.w / 2 - pad, right = glyph.x + glyph.w / 2 + pad
    const masses = inOutside ? outsideMasses : farMasses
    expect(masses.some(mass => (!glyph.supportId || mass.id !== glyph.supportId) && mass.right > left &&
      mass.left < right
      && mass.km < mark.km && mass.top < glyph.base), hint).toBe(false)
    if (!inOutside) expect(outsideMasses.some(mass => mass.right > left && mass.left < right
      && mass.top < glyph.base), hint).toBe(false)
    assertNeighbour(world, box.width, outside, glyph, mark, hint, towns)
    if (seat) seated++
    else unseated++
  }
  let raster = 0
  for (const tower of view.beyond) {
    const drawn = outside?.items.find(item => item.kind === 'tower' && item.seed === tower.seed &&
      item.x === tower.x * sx)
    if (drawn?.kind !== 'tower' || !terrain) continue
    const { dx, dy } = tower
    expect(dx).toBeDefined()
    expect(dy).toBeDefined()
    const km = Math.hypot(dx!, view.frame.eyeN - dy!)
    const expected = Math.min(projectedHeight(tower.heightM, km, tower.baseY, world.terrain.horizonY),
      visibleOverRidge(terrain, dx!, dy!, tower.heightM))
    expect(drawn.h).toBeCloseTo(expected, 6)
    expect(drawn.h + HEIGHT_TOLERANCE_PX).toBeGreaterThanOrEqual(1)
    expect(tower.km).toBeCloseTo(outsideDepth(world, dx!, dy!), 8)
    raster++
  }
  return { seated, unseated, raster }
}

