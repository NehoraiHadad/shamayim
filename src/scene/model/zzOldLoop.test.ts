import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { hashId, seeded } from '../../data/landmarks/hash'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { box } from '../../test/cloudSheetFrame'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { RANGES } from '../../world/field/cells'
import { createClumpSampler, mixSeed } from '../../world/field/clump'
import { layerSnapshot } from '../../world/field/density'
import { LOBED_ALT, OUTLINE_ALT } from '../../world/field/edges'
import { genusOf, smoothstep, unit } from '../../world/field/genus'
import { clumpAt } from '../../world/field/handover'
import { meanRadius } from '../../world/field/lattice'
import { kernel } from '../../world/field/rasterNodes'
import type { FieldSnapshot } from '../../world/field/transmit'
import type { FieldCell, FieldLayer } from '../../world/field/types'
import { makeWorldBuilder } from '../../world/world'
import { pxPerRadAt } from './advect'
import { gridFor } from './cloudSheetGrid'
import { seenDepth, type DepthAt } from './cloudSheetSeen'
import { shapeOf, type Shape } from './cloudSheetShape'
import { skyGeom, type SkyGeom } from './sky'

/* The loops of 5bccabd9 against today's, value for value (to be removed with them). */
const smooth = (f: number) => f * f * (3 - 2 * f)
const mix = (a: number, b: number, f: number) => a + (b - a) * f

function corner(seed: number, corners: Map<number, number>, octave: number, i: number, j: number) {
  // Pair signed integer coordinates injectively across the practical world range.
  const p = i >= 0 ? 2 * i : -2 * i - 1
  const q = j >= 0 ? 2 * j : -2 * j - 1
  const key = (p + q) * (p + q + 1) / 2 + q
  let value = corners.get(key)
  if (value === undefined) {
    value = seeded(mixSeed(seed ^ (0x51ed270b + octave), i, j))()
    if (corners.size >= 8192) corners.clear()
    corners.set(key, value)
  }
  return value
}

/** Memoize seeded corner neighborhoods for interleaved near and far queries. */
function oldSampler(seed: number, wavelength: number) {
  const octave = (level: number, scale: number) => {
    const corners = new Map<number, number>()
    const neighborhoods: { i: number; j: number; a: number; b: number; c: number; d: number }[] = []
    return (x: number, y: number) => {
      x *= scale
      y *= scale
      const i = Math.floor(x), j = Math.floor(y)
      const index = (i ^ Math.imul(j, 31)) & 127
      let cell = neighborhoods[index]
      if (!cell || i !== cell.i || j !== cell.j) {
        cell = neighborhoods[index] = {
          i, j, a: corner(seed, corners, level, i, j), b: corner(seed, corners, level, i + 1, j),
          c: corner(seed, corners, level, i, j + 1), d: corner(seed, corners, level, i + 1, j + 1),
        }
      }
      const f = smooth(x - i)
      return mix(mix(cell.a, cell.b, f), mix(cell.c, cell.d, f), smooth(y - j))
    }
  }
  const coarse = octave(0, 1)
  const fine = octave(1, 2)
  return (x: number, y: number, fineWeight = 1) => {
    x /= wavelength
    y /= wavelength
    return (2 * coarse(x, y) + (fineWeight ? fineWeight * fine(x, y) + (1 - fineWeight) * 0.5 : 0.5)) / 3
  }
}

/** Lovejoy's (1982) perimeter dimension of clouds, 1–1000 km: an outline with amplitudes m^-(2 - D + 1/2) at its m lobes. */
const DIMENSION = 1.35
/** Look. The outermost lobes drawn: two would be a mere oval, finer ones are the painters' own. */
const LOBES = 3
/** Look. How far the spectrum's first, two lobes, stands out in radii: a cell half as wide as it is long (1 - a over 1 + a). */
const OVAL = 1 / 3
const DEPTH = OVAL * (2 / LOBES) ** (2.5 - DIMENSION)
/** Value noise's standard deviation: a uniform corner's, 1/√12, by the mean square weight of its four, (26/35)²: .214. */
const VALUE_NOISE = 0.21
/** The sampler's coarse octave (2/3 of it) brought to the deviation of a sinusoid that deep (1/√2 of its peak). */
const PEAK = DEPTH * Math.SQRT1_2 / (VALUE_NOISE * 2 / 3)

const samplers = new Map<string, ReturnType<typeof oldSampler>>()

function samplerOf(placeId: string, lattice: FieldLayer['lattice'], wavelength: number) {
  const key = `${placeId}:edge:${lattice}`
  let sampler = samplers.get(key)
  if (!sampler) {
    if (samplers.size >= 32) samplers.delete(samplers.keys().next().value!)
    samplers.set(key, sampler = oldSampler(hashId(key), wavelength))
  }
  return sampler
}

/** How far (km) the field's outlines are moved at a place of the layer, and the share of it a ray at that range (km) and
 *  altitude (deg) is moved by along itself, for each km of its range. */
function oldNoise(placeId: string, layer: FieldLayer, minute: number) {
  const radius = meanRadius(layer.lattice, 1), amplitude = PEAK * radius
  const sampler = samplerOf(placeId, layer.lattice, 2 * Math.PI * radius / LOBES)
  const noise = clumpAt(layer, minute, (x, y) => sampler(x, y, 0))
  return {
    at: (x: number, y: number) => amplitude * (noise(x, y) - 0.5),
    // Along the ray: the projection draws its levels straight. Overhead, where every ray meets, it dies away.
    along: (range: number, altitude: number) => smoothstep(OUTLINE_ALT, LOBED_ALT, altitude) / Math.max(range, radius),
  }
}
function openness(cell: FieldCell, cells: readonly FieldCell[]): number {
  const d = Math.hypot(cell.x, cell.y), far = 1 + cell.r / d
  const x = cell.x * far, y = cell.y * far
  let open = 1
  for (const other of cells) {
    if (other === cell || !open) continue
    const dx = x - other.x, dy = y - other.y, r = other.r
    if (dx * dx + dy * dy < r * r) open *= 1 - Math.min(1, r * r / (cell.r * cell.r)) * smoothstep(1, 0.7, Math.sqrt(dx * dx + dy * dy) / r)
  }
  return open
}

function narrowed(s: number, wide: number): number {
  const n = 1 / (wide * wide)
  return 1 - 2 * n * s * (1 + (1 - n) / 3 * s * (1 + (4 - n) / 7.5 * s * (1 + (9 - n) / 14 * s
    * (1 + (16 - n) / 22.5 * s * (1 + (25 - n) / 33 * s)))))
}

function change(shape: Shape, east: number, north: number, range: number, scale: number): number {
  const { cell, d } = shape
  // Off to its side: it is only ever drawn wider.
  const along = east * shape.east + north * shape.north
  if (along <= range * shape.cos) return 0
  const inverse = 1 / (cell.r * cell.r), dx = east * scale - cell.x, dy = north * scale - cell.y
  const native = kernel(cell.tau0, (dx * dx + dy * dy) * inverse, shape.cumulus)
  // Its lobes are as much lower as it is, and stand on its sides and crown: its base is the level air condenses at.
  const still = shape.firm * unit(2 * (range * range - shape.mid) / shape.far)
  const at = range * (1 + (scale - 1) * shape.give * (1 - still)), up = at * at - shape.mid
  if (up >= shape.far || up <= -shape.near) return -native
  const bend = up > 0 ? shape.bend * up * up : 0, square = shape.mid + up * (shape.wide + bend)
  const cos = narrowed((1 - along / range) / 2, shape.wide + 3 * bend)
  return kernel(cell.tau0, (square + d * d - 2 * Math.sqrt(square) * d * cos) * inverse, shape.cumulus) - native
}
/** Sectors of the compass the shapes are kept by, for speed alone: a power of two, a third of a mean cell at the join. */
const SECTORS = 64
/** Rounding left where a cell's own depth is taken from the field's sum. */
const ROUNDING = 1e-9

/** The sector of a bearing given by a vector of any length: a measure that grows with it, with no trigonometry. */
function sectorOf(east: number, north: number): number {
  const turn = north / (Math.abs(east) + Math.abs(north) || 1)
  return (east >= 0 ? 1 - turn : 3 + turn) * SECTORS / 4 & SECTORS - 1
}

/** The shapes by the sectors they are drawn in (a half turn each at most). */
function bySector(shapes: Shape[]): Shape[][] {
  const sectors: Shape[][] = Array.from({ length: SECTORS }, () => [])
  for (const shape of shapes) {
    const { east, north, cos } = shape, sin = Math.sqrt(1 - cos * cos)
    const last = sectorOf(east * cos + north * sin, north * cos - east * sin)
    let sector = sectorOf(east * cos - north * sin, north * cos + east * sin)
    for (; sector !== last; sector = sector + 1 & SECTORS - 1) sectors[sector].push(shape)
    sectors[last].push(shape)
  }
  return sectors
}

function oldDepth(placeId: string, minute: number, snapshot: FieldSnapshot[number], geom: SkyGeom, depthAt: DepthAt) {
  const { layer, cells, heightKm } = snapshot
  if (!layer || (layer.lattice !== 'low' && layer.lattice !== 'mid')) return () => depthAt
  const noise = oldNoise(placeId, layer, minute)
  const perRad = Math.abs(pxPerRadAt(geom.azimuthAt, geom.width / 2))
  const shapes: Shape[] = []
  let outer = 0
  for (const cell of cells) {
    const shape = shapeOf(cell, heightKm, geom, perRad, () => openness(cell, cells))
    if (!shape) continue
    shapes.push(shape)
    outer = Math.max(outer, shape.to)
  }
  const sectors = bySector(shapes)
  return (range: number, altitude: number): DepthAt => {
    const along = noise.along(range, altitude)
    if (!along && range >= outer) return depthAt
    return (east, north) => {
      const scale = along ? 1 + along * noise.at(east, north) : 1
      const depth = depthAt(east * scale, north * scale)
      const here = sectors[sectorOf(east, north)]
      if (!here.length) return depth
      // A cell takes some of the place's displacement: none, all, or between.
      const low = Math.min(range, range * scale), high = Math.max(range, range * scale)
      let moved = 0
      for (let i = 0; i < here.length; i++) if (high > here[i].from && low < here[i].to) moved += change(here[i], east, north, range, scale)
      const seen = depth + moved
      return seen < layer.floorTau + ROUNDING ? layer.floorTau : seen
    }
  }
}

const cases = [
  ['neve-zohar', '2026-11-17T16:00'], ['haifa', '2026-11-17T15:30'], ['tel-aviv', '2026-11-17T12:00'], ['haifa', '2026-03-15T14:00'],
  ['jerusalem', '2026-11-17T06:00'], ['shadmot-mehola', '2026-11-17T10:00'], ['haifa', '2026-11-16T23:50'],
] as const
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter((place) => cases.some(([id]) => id === place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it('reads the sheets as the old loops did, bit for bit', () => {
  let nodes = 0, moved = 0
  for (const [id, time] of cases) {
    const input = worldInput(places.get(id)!, time as LocalTime, time as LocalTime), build = makeWorldBuilder()
    for (let minute = 0; minute < 40; minute += 4) {
      const world = build({ ...input, selected: addMinutes(time as LocalTime, minute) }), { field } = world.cloudField!, geom = skyGeom(world, box)
      for (const { lattice } of field.layers) {
        const snapshot = layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1]), { layer, heightKm, densityGrid } = snapshot
        if (!layer?.cover || lattice === 'tower' || lattice === 'high' || heightKm <= 0) continue
        const { ranges, altitudes, east, north } = gridFor(id, layer, geom, heightKm, genusOf(lattice, layer.form, 0.5))
        const now = seenDepth(id, field.t, snapshot, geom, densityGrid.resolvedTauAt), old = oldDepth(id, field.t, snapshot, geom, densityGrid.resolvedTauAt)
        for (let row = 0; row < ranges.length; row++) {
          const a = now(ranges[row], altitudes[row]), b = old(ranges[row], altitudes[row])
          for (let col = 0; col < east.length; col++) {
            const x = ranges[row] * east[col], y = ranges[row] * north[col], depth = a(x, y)
            if (!Object.is(depth, b(x, y))) expect.soft(depth, `${id} ${lattice} ${minute} ${row} ${col}`).toBe(b(x, y))
            nodes++
            if (depth !== densityGrid.resolvedTauAt(x, y)) moved++
          }
        }
      }
    }
  }
  console.info('OLD LOOP', nodes, moved)
  expect(nodes).toBeGreaterThan(300_000)
  expect(moved).toBeGreaterThan(20_000)
}, 240_000)

it('samples the air as the old sampler did, bit for bit', () => {
  for (const [seed, wavelength] of [[7, 0.2], [-12345, 3], [2 ** 31 - 5, 1.7]]) {
    const now = createClumpSampler(seed, wavelength), old = oldSampler(seed, wavelength), r = seeded(seed)
    for (let i = 0; i < 20_000; i++) {
      const x = (r() - 0.5) * 80, y = (r() - 0.5) * 80, w = i % 3 / 2
      if (now(x, y, w) !== old(x, y, w)) expect.soft(now(x, y, w), `${x} ${y}`).toBe(old(x, y, w))
    }
  }
})
