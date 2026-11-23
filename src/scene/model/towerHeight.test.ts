import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { projectCell } from '../../world/field/project'
import { buildWorld } from '../../world/world'
import { MERGE_KM } from './cloudCells'
import { towerAnvil } from './towerHeads'
import { cloudLayersOf } from './cloudLayers'
import { DOME_ALT, skyGeom } from './sky'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => p.id === 'haifa'))
}, 60_000)
afterAll(() => { vi.unstubAllGlobals() })

it('stands a near storm cell of a real day up to its true top, and cuts a far one only to its own shape', () => {
  const world = buildWorld(worldInput(loaded.get('haifa')!, '2026-03-15T14:00' as LocalTime))
  const geom = skyGeom(world, BOX)
  const cells = new Map(world.cloudField!.snapshot.find((s) => s.layer?.lattice === 'tower')!.cells.map((c) => [c.seed, c]))
  const towers = cloudLayersOf(world, BOX, geom).find((l): l is LayerOf<'cloudCells'> => l.kind === 'cloudCells')!
  const near = towers.cells.filter((c) => projectCell(cells.get(c.sprite.seed)!).rangeKm < 40)
  expect(near.some((c) => projectCell(cells.get(c.sprite.seed)!).rangeKm < 5)).toBe(true)
  let reliefColumns = 0
  for (const { sprite, y } of near) {
    const cell = cells.get(sprite.seed)!, p = projectCell(cell), top = Math.max(0, y - geom.dome(p.aTop))
    const diameter = 2 * cell.r / Math.sqrt(cell.share)
    const aspect = cell.vKm / diameter
    const seen = p.widthDeg * world.camera.pxPerDeg * geom.s
    expect(sprite.tall).toBeLessThanOrEqual(top + 1e-6)
    if (p.rangeKm <= MERGE_KM - diameter) {
      expect(sprite.tall).toBeGreaterThanOrEqual(Math.min(top, sprite.w * aspect) - 1e-6)
    }
    if (p.aTop <= DOME_ALT) {
      expect(sprite.tall).toBeLessThanOrEqual(seen * aspect + 1e-6)
      reliefColumns++
    }
  }
  expect(reliefColumns).toBeGreaterThan(0)
}, 30_000)

it('brings in the anvil continuously as a mature column becomes slender', () => {
  expect(towerAnvil(true, 11, 1)).toBe(0)
  expect(towerAnvil(true, 11, 1.25)).toBeCloseTo(0.5)
  expect(towerAnvil(true, 11, 1.5)).toBe(1)
  expect(towerAnvil(false, 11, 1.5)).toBe(0)
})
