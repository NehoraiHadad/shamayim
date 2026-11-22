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


it('probe', () => {
  const world = buildWorld(worldInput(loaded.get('haifa')!, '2026-03-15T17:00' as LocalTime))
  const layers = sceneModel(world, BOX).layers
  const out = layers.flatMap((l) => l.kind === 'cloudCells' ? l.cells.filter((c) => c.x < 40 || c.x > 335).map((c) => ['cell', Math.round(c.x), Math.round(c.y), Math.round(c.sprite.w), Math.round(c.sprite.tall), c.sprite.genus]) : [])
  const kinds = layers.filter((l) => l.surface === 'sky').map((l) => l.kind + ':' + l.z)
  throw new Error('PROBE ' + JSON.stringify([kinds, out]))
}, 30_000)
