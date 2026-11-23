import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { projectCell } from '../../world/field/project'
import type { WorldInput } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'
import { MERGE_KM, MERGE_PX, sceneStretch } from './cloudCells'
import { cloudLayersOf } from './cloudLayers'
import { skyGeom } from './sky'
import type { LayerOf, SceneBox } from './types'

/* The field's towers as sprites: where their cells stand, far to near, lit from the light's side, carried with their wind. */
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const THUNDER = { precipitation: 6, weatherCode: 95, cloudCover: 70, windSpeed: 25, windDirection: 250, humidity: 90 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => ['haifa', 'jerusalem'].includes(p.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const towersAt = (id: string, hour: string, forced: WorldInput['forced'] = THUNDER) => {
  const world = buildWorld({ ...worldInput(loaded.get(id)!, `2026-11-17T${hour}` as LocalTime), forced,
    forcedLayers: { low: 0.5, mid: 0.2, high: 0.2 } })
  const geom = skyGeom(world, BOX)
  const towers = cloudLayersOf(world, BOX, geom).find((l): l is LayerOf<'cloudCells'> => l.kind === 'cloudCells')
  return { world, geom, towers }
}

it('stands each tower on the dome where its cell is, far first', () => {
  const { world, geom, towers } = towersAt('jerusalem', '11:30')
  expect(towers?.cells.length).toBeGreaterThan(5)
  const cells = world.cloudField!.snapshot.find((s) => s.layer?.lattice === 'tower')!.cells
  const bySeed = new Map(cells.map((c) => [c.seed, c]))
  let previous = Infinity
  for (const { sprite, x, y } of towers!.cells) {
    const cell = bySeed.get(sprite.seed)!
    const p = projectCell(cell)
    expect(x).toBeCloseTo(geom.x(p.az), 6)
    expect(y).toBeCloseTo(geom.dome(Math.max(0, p.aNear)), 6)
    expect(y - sprite.tall).toBeGreaterThanOrEqual(geom.dome(p.aTop) - 1e-6)
    expect(['cb', 'cg']).toContain(sprite.genus)
    expect(sprite.w).toBeGreaterThan(1)
    expect(p.rangeKm).toBeLessThanOrEqual(previous + 1e-9)
    previous = p.rangeKm
  }
  expect(towers!.cells.some((c) => c.sprite.rains)).toBe(true)
  expect(towers!.cells.some((c) => c.sprite.genus === 'cb')).toBe(true)
}, 30_000)

it('lights each tower from the side of the sun on screen, and its underside at a low sun', () => {
  let checked = 0
  for (const hour of ['07:00', '12:00', '16:00']) {
    const { world, geom, towers } = towersAt('haifa', hour)
    const sx = geom.left + world.bodies.sun.x * geom.s, sy = BOX.landTop + world.bodies.sun.y
    for (const { sprite, x, y } of towers?.cells ?? []) {
      if (!sprite.toward || sprite.litA <= 0.02) continue
      const dx = sx - x, dy = sy - (y - sprite.tall / 2)
      const [tx, ty] = sprite.toward
      expect(Math.abs(Math.atan2(ty, tx) - Math.atan2(dy, dx))).toBeLessThan(1e-9)
      checked++
    }
    if (world.bodies.sun.altitude < 3) expect(towers!.cells.some((c) => c.sprite.glow > 0.05)).toBe(true)
  }
  expect(checked).toBeGreaterThan(0)
}, 60_000)

it('carries the towers with the wind across the view, all at one speed', () => {
  const { world } = towersAt('jerusalem', '11:30')
  const carried = sceneModel(world, BOX).layers.find((l) => l.kind === 'cloudCells')!
  const bands = carried.animated?.advect?.bands ?? []
  expect(bands.length).toBeGreaterThan(0)
  expect(new Set(bands.map((b) => b.speed)).size).toBe(1)
  // A wind from the west-south-west carries them east: on the left in the south-facing view.
  expect(bands[0].speed).toBeLessThan(0)
}, 30_000)

it('makes no towers without convection', () => {
  const { towers } = towersAt('jerusalem', '11:30', { cloudCover: 50, precipitation: 0, weatherCode: 2, humidity: 60 })
  expect(towers).toBeUndefined()
}, 30_000)

it('keeps each tower in its true aspect, so a far one is a low heap and not a streak', () => {
  const morning = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, windSpeed: 25, windDirection: 250, humidity: 80 }
  const { world, geom, towers } = towersAt('jerusalem', '07:00', morning)
  const stretch = sceneStretch(geom, world.camera.pxPerDeg * geom.s)
  expect(stretch).toBeLessThan(5)
  const cells = new Map(world.cloudField!.snapshot.find((s) => s.layer?.lattice === 'tower')!.cells.map((c) => [c.seed, c]))
  expect(towers?.cells.length).toBeGreaterThan(5)
  for (const { sprite } of towers!.cells) {
    const cell = cells.get(sprite.seed)!
    expect(sprite.tall / sprite.w).toBeLessThanOrEqual(stretch * cell.vKm / (2 * cell.r) + 1e-9)
  }
}, 30_000)

it('spreads an anvil only on the most mature storm cells in view', () => {
  for (const [id, hour] of [['haifa', '16:00'], ['jerusalem', '11:30']]) {
    const { world, towers } = towersAt(id, hour)
    const cells = new Map(world.cloudField!.snapshot.find((s) => s.layer?.lattice === 'tower')!.cells.map((c) => [c.seed, c]))
    const anvils = towers!.cells.filter((c) => (c.sprite.anvil ?? 0) > 0)
    expect(anvils.length).toBeGreaterThan(0)
    expect(anvils.length).toBeLessThanOrEqual(2)
    for (const { sprite } of anvils) {
      const cell = cells.get(sprite.seed)!
      expect(sprite.genus).toBe('cb')
      expect(sprite.tall).toBeGreaterThanOrEqual(1.5 * sprite.w)
      expect(cell.baseKm + cell.vKm).toBeGreaterThan(9.5)
    }
  }
}, 60_000)

it('stands a near storm cell of a real day up to its true top, a far heap to half of it', async () => {
  const world = buildWorld(worldInput(loaded.get('haifa')!, '2026-03-15T14:00' as LocalTime))
  const geom = skyGeom(world, BOX)
  const cells = new Map(world.cloudField!.snapshot.find((s) => s.layer?.lattice === 'tower')!.cells.map((c) => [c.seed, c]))
  const towers = cloudLayersOf(world, BOX, geom).find((l): l is LayerOf<'cloudCells'> => l.kind === 'cloudCells')!
  const near = towers.cells.filter((c) => projectCell(cells.get(c.sprite.seed)!).rangeKm < 30)
  expect(near).not.toHaveLength(0)
  for (const { sprite, y } of near) {
    const p = projectCell(cells.get(sprite.seed)!)
    expect(y - sprite.tall).toBeLessThan(geom.dome(p.aTop) + (p.rangeKm < 5 ? 0.25 : 0.5) * (y - geom.dome(p.aTop)))
  }
}, 30_000)

it('merges the far towers of a storm day into a soft mass along the horizon, not a row of streaks', () => {
  const world = buildWorld(worldInput(loaded.get('haifa')!, '2026-03-15T17:00' as LocalTime))
  const geom = skyGeom(world, BOX)
  const towers = cloudLayersOf(world, BOX, geom).find((l): l is LayerOf<'cloudCells'> => l.kind === 'cloudCells')!
  const cells = new Map(world.cloudField!.snapshot.find((s) => s.layer?.lattice === 'tower')!.cells.map((c) => [c.seed, c]))
  const far = towers.cells.filter((c) => projectCell(cells.get(c.sprite.seed)!).rangeKm > MERGE_KM)
  expect(far.length).toBeGreaterThan(10)
  for (const { sprite } of far) {
    expect(sprite.w).toBeGreaterThanOrEqual(MERGE_PX)
    expect(sprite.tall).toBeLessThanOrEqual(sprite.w)
  }
}, 30_000)

it('hangs the curtain of the raining core beside the place under its base, in front of the towers', () => {
  const world = buildWorld(worldInput(loaded.get('haifa')!, '2026-03-15T14:00' as LocalTime))
  const layers = sceneModel(world, BOX).layers
  const towers = layers.find((l): l is LayerOf<'cloudCells'> => l.kind === 'cloudCells')!
  const shafts = layers.find((l): l is LayerOf<'shafts'> => l.kind === 'shafts')!
  expect(shafts.z).toBeGreaterThan(towers.z)
  const near = shafts.shafts.filter((s) => s.bottom - s.top > 50)
  expect(near.length).toBeGreaterThan(0)
  expect(Math.max(...near.map((s) => s.alpha))).toBeGreaterThan(0.35)
}, 30_000)
