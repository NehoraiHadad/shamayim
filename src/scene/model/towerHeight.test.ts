import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { projectCell } from '../../world/field/project'
import { buildWorld } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { DOME_ALT } from './dome'
import { skyGeom } from './sky'
import { SLENDEREST } from './towerHeads'
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
  const near = towers.cells.filter((c) => projectCell(cells.get(c.sprite.seed)!).rangeKm < 30)
  expect(near.some((c) => projectCell(cells.get(c.sprite.seed)!).rangeKm < 5)).toBe(true)
  for (const { sprite, y } of near) {
    const cell = cells.get(sprite.seed)!, p = projectCell(cell), top = y - geom.dome(p.aTop)
    // What shortens a far tower is its true height against its width as it stands now (its radius grows with `share`).
    const own = sprite.w * cell.vKm * Math.sqrt(cell.share) / (2 * cell.r), shape = p.rangeKm < 5 ? Infinity : own
    expect(sprite.tall).toBeLessThanOrEqual(top + 1e-6)
    expect(sprite.tall).toBeGreaterThanOrEqual(Math.min(top, shape) - 1e-6)
    // No far tower is drawn more slender than it is (an icicle), and none more than a Cb ever is (a chimney).
    if (p.aTop <= DOME_ALT) expect(sprite.tall).toBeLessThanOrEqual(own + 1e-6)
    expect(sprite.tall / sprite.w).toBeLessThanOrEqual(SLENDEREST + 1e-6)
  }
}, 30_000)
