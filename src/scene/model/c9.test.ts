import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SKYLINE_TO_KM } from '../../data/city/outsideView'
import { offsetKm } from '../../data/landmarks/project'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../../test/scenePlaces'
import { VISIBLE_BOTTOM } from '../../world/layout'
import type { OutsideView, WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'
import { beamThrough, rayStrengths } from './rays'
import { skyGeom } from './sky'
import { mixLight, mixRgb, lightness } from './tone'
import type { LayerKind, LayerOf, SceneBox } from './types'
import { fresnel } from './water'

/**
 * The C9 review's defects (docs/design/CANVAS-SCENE-PLAN.md §6, C9 pack), each fixed by a general rule: the sun behind a
 * cloud lobe, the sky's bodies over the place's own mass, the water's names on their water, the towns 4–6 km out, the
 * water's mirror in linear light and the sun's path by the one light, the structures beyond within the reach, the far
 * towers' foot, the fabric's frontage, and the owner's rays (item 11). The mass against the light and the height label
 * are in `outside.test.ts` and `model.test.ts`.
 */
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const ALL = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES]
const IDS = ['haifa', 'jerusalem', 'tel-aviv', 'netanya', 'ramat-gan', 'masada', 'nahalal', 'zikhron-yaakov', 'beer-sheva', 'tiberias',
  'ein-gedi', 'rosh-pina']
let loaded: Map<string, LoadedPlace>
const worlds = new Map<string, WorldState>()

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(ALL.filter((p, i, all) => IDS.includes(p.id) && all.findIndex((q) => q.id === p.id) === i))
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

const worldAt = (id: string, hour = '11:00', forced: WorldInput['forced'] = null) => {
  const key = `${id}@${hour}@${JSON.stringify(forced)}`
  let world = worlds.get(key)
  if (!world) worlds.set(key, world = buildWorld({ ...worldInput(loaded.get(id)!, `2026-11-17T${hour}` as LocalTime), forced }))
  return world
}
const layers = <K extends LayerKind>(world: WorldState, kind: K) =>
  sceneModel(world, BOX).layers.filter((l): l is LayerOf<K> => l.kind === kind)

describe('C9: the sun behind a cloud and its glow (defect 2)', () => {
  // The app's `?wx=` thunder: the fixture's own thick share stays, so the disc shows veiled through the cloud.
  const THUNDER = { precipitation: 6, weatherCode: 95, cloudCover: 90, windSpeed: 25, windGusts: 50, windDirection: 250, humidity: 90 }
  it('lays the aureole over the clouds, the disc under them', () => {
    for (const [id, hour, forced] of [['haifa', '15:00', THUNDER], ['jerusalem', '08:00', null], ['tel-aviv', '06:20', null]] as const) {
      const model = sceneModel(worldAt(id, hour, forced), BOX)
      const sky = model.layers.filter((l) => l.surface === 'sky')
      const disc = sky.find((l) => l.id === 'bodies.sun'), aureole = sky.find((l) => l.id === 'bodies.aureole')
      expect(disc && aureole, `${id} ${hour}`).toBeTruthy()
      for (const cloud of sky.filter((l) => l.kind === 'clouds')) {
        expect(cloud.z).toBeGreaterThan(disc!.z)
        expect(cloud.z).toBeLessThan(aureole!.z)
      }
    }
  })

  it('gives a bank by the sun its silver edge whatever lights it from above', () => {
    const world = worldAt('haifa', '15:00', THUNDER)
    const geom = skyGeom(world, BOX)
    const sx = geom.left + world.bodies.sun.x * geom.s, sy = BOX.landTop + world.bodies.sun.y
    const banks = layers(world, 'clouds').flatMap((l) => l.banks)
    const near = banks.filter((b) => b.kind !== 'streak' && Math.hypot(b.x - sx, b.y - b.h / 2 - sy) < b.w / 2 && b.toward)
    expect(near.length).toBeGreaterThan(0)
    for (const b of near) expect(b.silver, b.id).toBeGreaterThan(.2)
    // Far from the sun, no silver.
    for (const b of banks.filter((x) => Math.hypot(x.x - sx, x.y - sy) > 300)) expect(b.silver).toBeLessThan(.2)
  })
})

describe('C9 defect 3, superseded (2026-11-20): the place\'s own mass hides a body behind it, as any drawn land', () => {
  it('lays no disc over the place\'s mass; the sun is judged on the drawn land, the mass included', () => {
    for (const [id, hour] of [['haifa', '06:20'], ['haifa', '16:30'], ['ein-gedi', '16:30'], ['jerusalem', '11:00'], ['jerusalem', '16:20']] as const) {
      const world = worldAt(id, hour)
      const model = sceneModel(world, BOX)
      expect(model.layers.filter((l) => l.kind === 'bodies' && l.surface === 'land'), `${id} ${hour}`).toEqual([])
      if (world.light.source === 'sun') expect(world.bodies.sun.overLand).toBe(true)
    }
  })
})

describe('C9: the water\'s names on their water (defect 5)', () => {
  const inside = (poly: readonly (readonly [number, number])[], x: number, y: number) => {
    let hit = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  it.each(['netanya', 'haifa', 'ramat-gan', 'tel-aviv', 'tiberias', 'ein-gedi', 'masada', 'zikhron-yaakov'])('%s: never in the sky nor among what the place builds', (id) => {
    const world = worldAt(id)
    const view = world.place3 as OutsideView
    const blocks = [...view.skyline.boxes.map((b) => [b.x - b.w / 2, b.x + b.w / 2, b.top, b.foot]),
      ...[...view.skyline.towers, ...view.beyond].map((t) => [t.x - t.w / 2, t.x + t.w / 2, t.baseY - t.h, t.baseY])]
    for (const note of world.labels.notes.filter((n) => n.kind === 'water')) {
      // The letters (3–10 px under the box's top) on water: its own stretch between the far and the near edge, or the sea.
      const glyph = { left: note.left, right: note.left + note.width, top: note.top + 3, bottom: note.top + 10 }
      expect(glyph.bottom).toBeLessThanOrEqual(VISIBLE_BOTTOM)
      for (const [l, r, t, b] of blocks) expect(glyph.right <= l || glyph.left >= r || glyph.bottom <= t || glyph.top >= b, note.text).toBe(true)
      const mid = (glyph.left + glyph.right) / 2
      // (The shore's raggedness under a letter or two is let pass, as the placement does: the text's middle on water.)
      const spans = world.water.spans.filter((s) => s.name === note.text && s.from <= mid && s.to >= mid)
      const middle = (glyph.top + glyph.bottom) / 2
      const onSpan = spans.some((s) => {
        const e = s.edges.reduce((best, x) => Math.abs(x.x - mid) < Math.abs(best.x - mid) ? x : best)
        return middle >= e.farY && middle <= e.nearY
      })
      const sea = world.water.coastalSea
      const onSea = Boolean(sea && [[glyph.left, glyph.top], [glyph.right, glyph.top], [glyph.left, glyph.bottom], [glyph.right, glyph.bottom]]
        .every(([x, y]) => inside(sea.points, x, y)))
      expect(onSpan || onSea, `${id} ${note.text}`).toBe(true)
    }
  })

  it('names Netanya\'s sea on the sea itself, and Tiberias\'s lake on the lake', () => {
    expect(worldAt('netanya').labels.notes.some((n) => n.kind === 'water' && n.text === 'ים')).toBe(true)
    expect(worldAt('tiberias').labels.notes.some((n) => n.kind === 'water' && n.text === 'כנרת')).toBe(true)
  })
})

describe('C9: the towns beyond the place within the reach (defect 6)', () => {
  it('draws the neighbours\' built squares 0–6 km out, outside the place, where the land lets the eye see them', () => {
    for (const id of ['ramat-gan', 'tel-aviv', 'haifa']) {
      const view = worldAt(id).place3 as OutsideView
      expect(view.beyondTowns?.length ?? 0, id).toBeGreaterThan(20)
      const nearK = view.frame.k * view.frame.midDepth / (view.frame.eyeN - view.frame.n)
      for (const b of view.beyondTowns!) {
        expect(b.h).toBeGreaterThan(.79)
        // Never larger a metre than the place's own at its near edge (the look boosts the low fabric alike).
        expect(b.h / Math.max(1, b.heightM)).toBeLessThanOrEqual(Math.max(nearK, 1.2) + 1e-6)
      }
      // Far first.
      for (let i = 1; i < view.beyondTowns!.length; i++) expect(view.beyondTowns![i].km).toBeLessThanOrEqual(view.beyondTowns![i - 1].km)
    }
  })

  it('stands Ramat Gan\'s frame-edge towers in their towns', () => {
    const view = worldAt('ramat-gan').place3 as OutsideView
    const edge = view.beyond.filter((t) => t.x < 40 || t.x > 335)
    expect(edge.length).toBeGreaterThan(0)
    const footed = edge.filter((t) => view.beyondTowns!.some((b) => Math.abs(b.x - t.x) < 8 && Math.abs(b.baseY - t.baseY) < 4))
    expect(footed.length / edge.length).toBeGreaterThan(.6)
  })
})

describe('C9: water against the land at a low sun (defect 7)', () => {
  it('mixes the mirror\'s share in linear light: a share of a light over a dark is no darker than it looks', () => {
    const sky = [0.85, 0.7, 0.6] as const, dark = [0.05, 0.1, 0.12] as const
    const f = fresnel(3)
    expect(lightness(mixLight(dark, sky, f))).toBeGreaterThan(lightness(mixRgb(dark, sky, f)))
    expect(mixLight(dark, sky, 0)).toEqual(dark.map((v) => expect.closeTo(v, 6)))
    expect(mixLight(dark, sky, 1)).toEqual(sky.map((v) => expect.closeTo(v, 6)))
  })

  it('lays the sun\'s path by the world\'s own direct light and sun (Masada at sunrise)', () => {
    const world = worldAt('masada', '06:20')
    expect(world.bodies.sun.overLand).toBe(true)
    // At 06:20 the 04:30 observation has expired. The hourly blend gives 25.6 km visibility and 0.618216 cloud transmission.
    expect(world.light.direct).toBeCloseTo(0.082220, 6)
    expect(world.water.glints.length).toBeGreaterThan(0)
    expect(world.water.light!.strength).toBeCloseTo(world.light.direct, 6)
  })
})

describe('C9: structures beyond the place within the reach (defect 8)', () => {
  it('shows a neighbour\'s tall structure 0–6 km out, named or not, and leaves the low ones', () => {
    const { place, landmarks } = loaded.get('nahalal')!
    const world = worldAt('nahalal')
    const shown = new Set(world.marks.map((m) => m.id))
    const chimney = landmarks.find((l) => l.kind === 'chimney' && !l.nameHe)
    expect(chimney).toBeTruthy()
    const { dx, dy } = offsetKm(place, chimney!)
    expect(Math.hypot(dx, dy)).toBeLessThan(SKYLINE_TO_KM)
    expect(shown.has(chimney!.id)).toBe(true)
    const beyond = (l: typeof landmarks[number]) => { const o = offsetKm(place, l); return Math.hypot(o.dx, o.dy) > 2 }
    for (const low of landmarks.filter((l) => l.heightM < 20 && !l.nameHe && l.source === 'osm' && beyond(l))) expect(shown.has(low.id), low.id).toBe(false)
  })
})

describe('C9: far towers stand on their own foot (defect 9)', () => {
  it('gives every far tower a low hall at its base', () => {
    const world = worldAt('zikhron-yaakov')
    const { towers, shapes } = world.farCities
    expect(towers.length).toBeGreaterThan(0)
    for (const t of towers.slice(0, 40)) {
      const foot = shapes.blocks.find((b) => b.base === t.base && b.km === t.km && b.w > 2 && b.x <= t.x && b.x + b.w >= t.x
        && b.h < .3 * (t.base - t.top) + 1)
      expect(foot, `${t.x}`).toBeTruthy()
    }
  })
})

describe('C9: the fabric\'s frontage from the built share (defect 10)', () => {
  it('leaves the streets and yards open where the raster says the ground is thinly built', () => {
    const view = worldAt('beer-sheva').place3 as OutsideView
    const boxes = view.skyline.boxes.filter((b) => (b.heightM ?? 0) >= 12.5)
    const widths = new Set(boxes.map((b) => Math.round(b.w * 4)))
    expect(widths.size).toBeGreaterThan(4)
  })
})

describe('C9: sun rays where they really occur (the owner\'s item 11)', () => {
  const BROKEN = { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2, humidity: 60, visibilityKm: 25 }
  const CLEAR_DRY = { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, humidity: 30, visibilityKm: 40 }
  it('casts none by night or at a high sun in clear dry air', () => {
    for (const id of ['haifa', 'jerusalem', 'ein-gedi']) {
      const night = rayStrengths(worldAt(id, '21:00', BROKEN))
      expect(Math.max(...Object.values(night))).toBe(0)
      const noon = rayStrengths(worldAt(id, '12:00', CLEAR_DRY))
      expect(Math.max(...Object.values(noon)), id).toBeLessThan(.05)
    }
  })

  it('casts crepuscular rays through broken cloud, more at a low sun and in hazier air', () => {
    const low = rayStrengths(worldAt('tel-aviv', '07:00', BROKEN)).crepuscular
    const high = rayStrengths(worldAt('tel-aviv', '12:00', BROKEN)).crepuscular
    const hazy = rayStrengths(worldAt('tel-aviv', '12:00', { ...BROKEN, visibilityKm: 10 })).crepuscular
    expect(low).toBeGreaterThan(high)
    expect(hazy).toBeGreaterThan(high)
    expect(rayStrengths(worldAt('tel-aviv', '12:00', { ...BROKEN, cloudCover: 0, thickCloud: 0 })).crepuscular).toBe(0)
  })

  it('fades the rays and the glare again in fog: the air that scatters the beam also blocks it', () => {
    expect(beamThrough(worldAt('tel-aviv', '12:00', { ...BROKEN, visibilityKm: 10 }))).toBeCloseTo(1, 1)
    expect(beamThrough(worldAt('tel-aviv', '12:00', { ...BROKEN, visibilityKm: 25 }))).toBe(1)
    const at = (km: number) => rayStrengths(worldAt('tel-aviv', '09:00', { ...BROKEN, humidity: 95, visibilityKm: km }))
    const haze = at(10), mist = at(4), fog = at(1.5)
    expect(haze.crepuscular).toBeGreaterThan(mist.crepuscular)
    expect(mist.crepuscular).toBeGreaterThan(fog.crepuscular)
    expect(fog.crepuscular).toBeLessThan(.1 * haze.crepuscular)
    expect(fog.corona).toBeLessThanOrEqual(.1 * Math.max(haze.corona, .05))
    // The review's two fog moments (Tiberias 12:00, Nahalal 08:00, the harness's fog): gentle, not full.
    const FOG = { humidity: 99, visibilityKm: 1.5, cloudCover: 60, thickCloud: 30, precipitation: 0, weatherCode: 45, windSpeed: 6, windGusts: 10 }
    for (const [id, hour] of [['tiberias', '12:00'], ['nahalal', '08:00']]) {
      const s = rayStrengths(worldAt(id, hour, FOG))
      expect(Math.max(s.crepuscular, s.corona, s.ridge), id).toBeLessThan(.05)
    }
  })

  it('fans rays over the crest when the sun stands just at it, and a glare round a sun seen clear', () => {
    const dawn = worldAt('ein-gedi', '06:20')
    const c = dawn.bodies.sun.clearance!
    expect(c).toBeGreaterThan(-10)
    expect(c).toBeLessThan(9)
    expect(rayStrengths(dawn).ridge).toBeGreaterThan(.05)
    const seen = worldAt('jerusalem', '06:20')
    expect(seen.bodies.sun.overLand).toBe(true)
    expect(rayStrengths(seen).corona).toBeGreaterThan(.2)
    // A sun behind the land has no glare (the living light: the glare goes with the share of the disc still over the land,
    // so a disc just behind the line keeps a trace of it, none once wholly behind).
    const behind = worldAt('haifa', '16:30')
    expect(behind.bodies.sun.overLand).toBe(false)
    expect(rayStrengths(behind).corona).toBeLessThanOrEqual(0.5 * behind.bodies.sun.visible!)
    expect(rayStrengths(behind).corona).toBeLessThan(0.05)
  })

  it('converges the anticrepuscular rays on the point opposite the sun, only with strong rays at a low sun', () => {
    const world = worldAt('tel-aviv', '07:00', { ...BROKEN, visibilityKm: 12 })
    const s = rayStrengths(world)
    expect(s.crepuscular).toBeGreaterThan(.25)
    expect(s.anti).toBeGreaterThan(0)
    const anti = layers(world, 'rays').find((l) => l.id === 'rays.anti')
    const geom = skyGeom(world, BOX)
    if (anti) expect(anti.x).toBeCloseTo(geom.x(world.bodies.sun.azimuth + 180), 6)
    expect(rayStrengths(worldAt('tel-aviv', '12:00', { ...BROKEN, visibilityKm: 12 })).anti).toBe(0)
  })
})
