import { LEGIBLE_PX, MAX_EXAGGERATION, NEIGHBOUR_MIN_TRUE_PX } from '../../world/neighbourSize'
import path from 'node:path'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { hashId } from '../../data/landmarks/hash'
import { distanceOf, offsetKm } from '../../data/landmarks/project'
import { anglePx } from '../../data/terrain/angleScale'
import { baseAngle } from '../../data/terrain/apparentHeight'
import { bundledWorldLoader, type BundledContext } from '../../test/bundledWorld'
import { stubCachedPublicFetch } from '../../test/bundledFetch'
import { outsideDepth } from '../../test/drawnGeometryAssertions'
import { sceneModel } from '.'
import { outsideLayer, outsideMass } from './outside'
import { buildWorld } from '../../world/world'

/** The production gazetteer point and the audited non-own silo south of Karmei Tzur. */
const PLACE = { id: 'osm:way:462664109', lat: 31.6092, lon: 35.1009, nameHe: '×›×¨×ž×™ ×¦×•×¨',
  regionHe: '×”×¨×™ ×™×”×•×“×”', timezone: 'Asia/Jerusalem', usesOsm: true, settlementType: 'village' }
const SILO = 'il-silo-31.56601-35.10073'
const BOX = { width: 375, skyHeight: 0, landTop: 0, landHeight: 128, dpr: 2 }
let ctx: BundledContext

beforeAll(async () => {
  stubCachedPublicFetch()
  const load = await bundledWorldLoader(path.resolve(__dirname, '../../..'))
  ctx = await load({ place: PLACE, source: 'karmei-tzur' }, { 'il-minaret-31.58592-35.10681': 17 })
})
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each([375, 1280])('sizes the silo from the outside eye and culls its covered foot at %i px', width => {
  const { world, landmarkById } = ctx
  const silo = world.marks.find(mark => mark.id === SILO)!
  const source = landmarkById.get(SILO)!
  expect(silo).toBeDefined()
  const { dx, dy } = offsetKm(PLACE, source)
  expect(silo.km).toBeCloseTo(outsideDepth(world, dx, dy), 8)
  expect(silo.sightKm!).toBeGreaterThan(distanceOf(PLACE, source))
  expect(silo.h * silo.scale).toBeGreaterThan(2)
  expect(silo.h * silo.scale).toBeLessThan(2.4)
  const model = sceneModel(world, { ...BOX, width })
  const glyphs = model.layers.flatMap(layer => layer.kind === 'outside'
    ? layer.items.flatMap(item => item.kind === 'mark' ? [item.glyph.seed] : []) : [])
  expect(glyphs).not.toContain(hashId(SILO))
})

it(("culls a floating non-own silo without its own visible town and reuses geometry " +
    "through hour changes"), () => {
  const silo = ctx.world.marks.find(mark => mark.id === SILO)!
  if (ctx.world.place3.kind !== 'outside') throw new Error('Missing outside view')
  const near = { points: [[0, 120], [375, 120]] as [number, number][], distanceKm: [1, 1] }
  const world = { ...ctx.world, marks: [silo], seatPool: [], terrain: { ...ctx.world.terrain, near },
    place3: { ...ctx.world.place3, land: null, beyond: [], beyondTowns: [], skyline: { ...ctx.world.place3.skyline,
      boxes: [], towers: [] } } }
  expect(outsideLayer(world, BOX, [])).toBeNull()
  const mass = outsideMass(world, BOX, [])
  const changed = { ...world, air: { ...world.air, visibilityKm: 1 }, farCities: { ...world.farCities, patches: [] } }
  expect(outsideMass(changed, BOX, [])).toBe(mass)
})

it('retains true base-angle size in the world but culls far glyphs without proven town ownership', () => {
  const seenAt = () => ({ y: 70 - NEIGHBOUR_MIN_TRUE_PX, groundY: 70, angle: 1, groundAngle: 1 })
  const terrain = { ...ctx.input.terrain, seenAt, sightAt: () => ({ nearKm: 3, farKm: 30, farShows: false, seenAt }) }
  const source = { id: 'far-hall', lat: PLACE.lat - .14605, lon: PLACE.lon, kind: 'church' as const,
    heightM: 9, nameHe: 'Far hall', source: 'osm' as const, fame: 2 as const }
  const build = (heightM: number) => buildWorld({ ...ctx.input, terrain, landmarks: [{ ...source, heightM }],
    seatCandidates: [], far: null })
  const low = build(9), tall = build(120)
  const km = distanceOf(PLACE, source)
  expect(km).toBeCloseTo(16.24, 2)
  const farCities = { ...tall.farCities, patches: [{ left: 187, right: 189, top: 69, bottom: 72, km: 8, built: 1,
    level: 3, area: 1 }],
    shapes: { mass: [], blocks: [{ x: 187, w: 2, base: 72, h: 3, km: 8 }], lights: [] } }
  for (const width of [375, 1280]) {
    const lowLayer = sceneModel(low, { ...BOX, width }).layers.find(layer => layer.kind === 'marks')
    expect(lowLayer?.glyphs.map(glyph => glyph.seed) ?? []).not.toContain(hashId(source.id))
    const glyph = tall.marks.find(mark => mark.id === source.id)
    expect(glyph).toBeDefined()
    const a0 = baseAngle(glyph!.base, tall.terrain.horizonY), rise = Math.atan(120 / (km * 1000)) * 180 / Math.PI
    expect(glyph!.h * glyph!.scale).toBeCloseTo(Math.min(NEIGHBOUR_MIN_TRUE_PX, anglePx(a0 + rise) - anglePx(a0)), 6)
    expect(sceneModel(tall, { ...BOX, width }).layers.find(layer => layer.kind === 'marks')?.glyphs ?? []).toEqual([])
    const hidden = sceneModel({ ...tall, farCities }, { ...BOX, width }).layers.find(layer => layer.kind === 'marks')
    expect(hidden?.glyphs.map(glyph => glyph.seed) ?? []).not.toContain(hashId(source.id))
  }
})


it('renders a genuinely visible far standalone castle through the full world and scene paths', () => {
  const seenAt = () => ({ y: 66, groundY: 70, angle: 1, groundAngle: 0 })
  const terrain = { ...ctx.input.terrain, seenAt,
    sightAt: () => ({ nearKm: 3, farKm: 30, farShows: false, seenAt }) }
  const source = { id: 'far-castle', lat: PLACE.lat - .14605, lon: PLACE.lon, kind: 'castle' as const,
    heightM: 120, nameHe: 'Visible castle', source: 'osm' as const, fame: 1 as const }
  const built = buildWorld({ ...ctx.input, terrain, landmarks: [source], seatCandidates: [], far: null, city: null })
  if (built.place3.kind !== 'outside') throw new Error('Missing outside frame')
  const near = { points: [[0, 110], [375, 110]] as [number, number][], distanceKm: [1, 1] }
  const world = { ...built, terrain: { ...built.terrain, near },
    place3: { ...built.place3, land: null, beyond: [], beyondTowns: [],
      skyline: { ...built.place3.skyline, boxes: [], towers: [] } } }
  expect(world.marks.find(m => m.id === source.id)?.plane).not.toBe('near')
  for (const width of [375, 1280]) {
    const glyph = sceneModel(world, { ...BOX, width }).layers.find(l => l.kind === 'marks')?.glyphs
      .find(g => g.sourceId === source.id)
    expect(glyph).toBeDefined()
    expect(glyph!.h * glyph!.scale).toBeCloseTo(LEGIBLE_PX, 6)
    expect(glyph!.factor).toBeGreaterThanOrEqual(1)
    expect(glyph!.factor).toBeLessThanOrEqual(MAX_EXAGGERATION)
    expect(glyph!.town).toBe(false)
  }
})
