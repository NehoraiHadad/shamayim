import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { projectCell } from '../../world/field/project'
import { buildWorld } from '../../world/world'
import { raisedAspect, sceneStretch, shapeOf } from './towerAspect'
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
  const stretch = sceneStretch(geom, world.camera.pxPerDeg * geom.s)
  const reliefStorms: { rangeKm: number; before: number; after: number; limit: number }[] = []
  let exceededInOriginalProjection = false
  for (const { sprite, y } of near) {
    const cell = cells.get(sprite.seed)!, p = projectCell(cell), top = y - geom.dome(p.aTop)
    const aspect = cell.vKm / (2 * cell.r)
    const limit = cell.genus === 'cb' ? shapeOf(aspect, stretch, p.aTop) : raisedAspect(aspect, stretch)
    const shape = p.rangeKm < 5 ? Infinity : sprite.w * limit
    expect(sprite.tall).toBeLessThanOrEqual(top + 1e-6)
    expect(sprite.tall).toBeGreaterThanOrEqual(Math.min(top, shape) - 1e-6)
    if (cell.genus === 'cb' && p.rangeKm > 5 && p.aTop < DOME_ALT) {
      const before = Math.min(top / sprite.w, raisedAspect(aspect, stretch))
      const after = sprite.tall / sprite.w, reliefLimit = Math.max(1, aspect)
      reliefStorms.push({ rangeKm: p.rangeKm, before, after, limit: reliefLimit })
      expect(after).toBeLessThanOrEqual(reliefLimit + 1e-6)
      exceededInOriginalProjection ||= before > reliefLimit
    }
  }
  console.log(JSON.stringify({ reliefStorms }))
  expect(reliefStorms.length).toBeGreaterThan(0)
  expect(exceededInOriginalProjection).toBe(true)
}, 30_000)
