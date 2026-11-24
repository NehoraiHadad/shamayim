import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { box, neutral } from '../../test/cloudSheetFrame'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { makeWorldBuilder } from '../../world/world'
import { cloudSheetOf } from './cloudSheet'
import type * as Edges from './cloudSheetEdges'
import type * as Seen from './cloudSheetSeen'
import type * as ShapeModule from './cloudSheetShape'
import { skyGeom } from './sky'

/* The work of a scrub's new sheets, counted: the same on every machine. Its time is the perf job's. */
const none = { cells: 0, shapes: 0, open: 0, nodes: 0, depths: 0, noise: 0, candidates: 0, changes: 0 }
const counts = vi.hoisted(() => ({} as Record<string, number>))
vi.mock('./cloudSheetShape', async (load) => {
  const real = await load<typeof ShapeModule>()
  return { ...real,
    shapeOf: (...args: Parameters<typeof real.shapeOf>) => {
      counts.shapes++
      const shape = real.shapeOf(...args)
      if (!shape) return shape
      const { from } = shape
      // Every shape a place's sector holds is asked for its first range.
      return Object.defineProperty(shape, 'from', { get: () => { counts.candidates++; return from } })
    },
    openness: (...args: Parameters<typeof real.openness>) => { counts.open++; return real.openness(...args) },
    change: (...args: Parameters<typeof real.change>) => { counts.changes++; return real.change(...args) },
  }
})
vi.mock('./cloudSheetEdges', async (load) => {
  const real = await load<typeof Edges>()
  return { edgeNoise: (...args: Parameters<typeof real.edgeNoise>) => {
    const noise = real.edgeNoise(...args)
    return { ...noise, at: (x: number, y: number) => { counts.noise++; return noise.at(x, y) } }
  } }
})
vi.mock('./cloudSheetSeen', async (load) => {
  const real = await load<typeof Seen>()
  return { seenDepth: (...[id, minute, snapshot, geom, depthAt]: Parameters<typeof real.seenDepth>) => {
    counts.cells += snapshot.cells.length
    const seen = real.seenDepth(id, minute, snapshot, geom, (x, y) => { counts.depths++; return depthAt(x, y) })
    return (range: number, altitude: number) => {
      const read = seen(range, altitude)
      return (x: number, y: number) => { counts.nodes++; return read(x, y) }
    }
  } }
})

const cases = [
  ['neve-zohar', '2026-11-17T16:00'], ['haifa', '2026-11-17T15:30'], ['tel-aviv', '2026-11-17T12:00'], ['haifa', '2026-03-15T14:00'],
] as const
const MINUTES = 8
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter((place) => cases.some(([id]) => id === place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it('shows the field as the eye sees it at a bounded work a node', () => {
  const total = { ...none }
  for (const [id, time] of cases) {
    Object.assign(counts, none)
    const input = worldInput(places.get(id)!, time as LocalTime, time as LocalTime), build = makeWorldBuilder()
    for (let minute = 0; minute < MINUTES; minute++) {
      const world = build({ ...input, selected: addMinutes(time as LocalTime, minute) }), { field } = world.cloudField!
      for (const { lattice } of field.layers) cloudSheetOf(world, skyGeom(world, box), layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1]), neutral)
    }
    console.info('COST', id, time, JSON.stringify(counts))
    for (const key of Object.keys(none) as (keyof typeof none)[]) total[key] += counts[key]
  }
  const { cells, shapes, open, nodes, depths, noise, candidates, changes } = total
  console.info('COST all', JSON.stringify(total), { open: open / cells, noise: noise / nodes, candidates: candidates / nodes, changes: changes / nodes })
  expect(nodes).toBeGreaterThan(50_000)
  // A shape is prepared once a cell, and its surroundings looked at only where it is redrawn.
  expect(shapes).toBeLessThanOrEqual(cells)
  expect(open / cells).toBeLessThanOrEqual(0.5)
  // The field and its air are read once a node, the air only above the join.
  expect(depths).toBeLessThanOrEqual(nodes)
  expect(noise / nodes).toBeLessThanOrEqual(0.8)
  // The sectors leave a node a few cells to ask, the ranges fewer to redraw.
  expect(candidates / nodes).toBeLessThanOrEqual(6)
  expect(changes / nodes).toBeLessThanOrEqual(2)
}, 240_000)
