import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { placeBounds, boundsHoldKm } from '../../data/city/bounds'
import { outsideFrame, outsideSkyline } from '../../data/city/outsideView'
import { industrialNamed, landmarkBeyond, nameIsName } from '../../data/landmarks/industrial'
import { loadIsrael } from '../../data/landmarks/israelData'
import { panoramaShortlist } from '../../data/landmarks/shortlist'
import { loadLandmarkSource } from '../../data/landmarks/useLandmarks'
import { portraitReach } from '../../data/landmarks/portrait'
import { distanceOf, offsetKm } from '../../data/landmarks/project'
import { groundFn } from '../../data/landmarks/seat'
import type { Landmark } from '../../data/landmarks/types'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../../test/scenePlaces'
import { SHEET_CLEAR, VISIBLE_BOTTOM } from '../../world/layout'
import { HOUSE_TOP_M } from '../../data/city/outsideView'
import { STOREY_M } from '../../data/city/skylineHeight'
import { legibleHouse, lookOf, rowKm, seaHorizonY } from '../../world/outside'
import type { OutsideView, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { groundAt as lineAt } from '../../world/sceneLight'
import { SCENE_CAMERA, xOf } from '../../domain/camera'
import { sceneModel } from '.'
import { againstLight, tonesAt } from './marks'
import { landBehind } from './outside'
import { toneAt } from './planeLight'
import { skyAt } from './sky'
import type { Box, LayerOf, SceneBox } from './types'

/**
 * Stage C5 (docs/design/CANVAS-SCENE-PLAN.md §3 tier 1 "Truth", C5's accept list): every place seen from outside by one
 * builder (owner, 2026-11-19), with its own boundary, its slope, the towers beyond it, its coastal sea, the far-mark and
 * industrial-landmark rules.
 */
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const NOON: LocalTime = '2026-11-17T12:00'
const CITIES = ['tel-aviv', 'ramat-gan', 'haifa', 'jerusalem', 'beer-sheva', 'netanya']
const VILLAGES = ['shadmot-mehola', 'rosh-pina', 'nahalal']
const ALL = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES]
let loaded: Map<string, LoadedPlace>
const worlds = new Map<string, WorldState>()

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(ALL.filter((p) => [...CITIES, ...VILLAGES, 'zikhron-yaakov', 'ramon-crater'].includes(p.id)))
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

function worldAt(id: string, at: LocalTime = NOON) {
  const key = `${id}@${at}`
  let world = worlds.get(key)
  if (!world) worlds.set(key, world = buildWorld(worldInput(loaded.get(id)!, at)))
  return world
}
const viewOf = (id: string) => worldAt(id).place3 as OutsideView
const layerOf = (world: WorldState) => sceneModel(world, BOX).layers.find((l) => l.kind === 'outside') as LayerOf<'outside'> | undefined
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe.each(CITIES)('outside view: %s', (id) => {
  it('is seen from outside, its frame cut at its own mapped boundary', () => {
    const view = viewOf(id)
    expect(view.kind).toBe('outside')
    expect(view.bounds.source).toBe('boundary')
    expect(view.fabric).toBe('cover')
  })

  it('draws east left and west right of the dot: left–right is the true east–west order, row by row', () => {
    const { skyline, frame } = viewOf(id)
    const items = [...skyline.towers, ...skyline.boxes].filter((t) => t.dx !== undefined && Math.abs(t.dx!) > .05)
    expect(items.length).toBeGreaterThan(20)
    for (const t of items) expect(Math.sign(t.x - frame.centerX), `${t.dx}`).toBe(-Math.sign(t.dx!))
    // Within a row of depth (100 m), a thing further east stands further left.
    const rows = new Map<number, typeof items>()
    for (const t of items) rows.set(Math.round(t.dy! * 10), [...rows.get(Math.round(t.dy! * 10)) ?? [], t])
    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => b.dx! - a.dx!)
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].dx! - sorted[i].dx! > .02 && Math.abs(sorted[i - 1].dy! - sorted[i].dy!) < .01) {
          expect(sorted[i].x).toBeGreaterThan(sorted[i - 1].x)
        }
      }
    }
  })

  it('takes depth from north–south: the north nearer, larger, and drawn over the south', () => {
    const { skyline, frame } = viewOf(id)
    const items = skyline.boxes.filter((b) => b.dy !== undefined)
    const span = frame.n - frame.s
    const north = items.filter((b) => b.dy! > frame.n - .15 * span), south = items.filter((b) => b.dy! < frame.s + .5 * span)
    expect(north.length && south.length).toBeTruthy()
    for (const b of items) {
      expect(b.dy!).toBeGreaterThanOrEqual(frame.s - 1e-9)
      expect(b.dy!).toBeLessThanOrEqual(frame.n + 1e-9)
    }
    for (const b of north) expect(b.near).toBeGreaterThan(.85)
    for (const b of south) expect(b.near).toBeLessThanOrEqual(.5 + 1e-9)
    // A metre stands taller on the near side than the far (perspective), so the same height reads larger nearer.
    const px = (b: typeof items[number]) => (b.foot - b.top) / Math.max(1, b.heightM ?? 1)
    const mean = (list: typeof items) => list.reduce((s, b) => s + px(b), 0) / list.length
    expect(mean(north)).toBeGreaterThan(mean(south))
    // The painter's order: the layer draws its own things back to front by where they stand.
    const own = layerOf(worldAt(id))!.items.filter((i): i is Extract<typeof i, { kind: 'box' }> => i.kind === 'box' && !i.beyond)
    for (let i = 1; i < own.length; i++) expect(own[i].foot).toBeGreaterThanOrEqual(own[i - 1].foot - .01)
  })

  it('stands a taller tower over a lower one (300 m beats 90 m)', () => {
    const { skyline } = viewOf(id)
    const towers = skyline.towers
    const tall = towers.filter((t) => t.heightM >= 140), low = towers.filter((t) => t.heightM <= .3 * Math.max(...tall.map((x) => x.heightM), 0))
    for (const a of tall) for (const b of low) expect(a.h, `${a.heightM} vs ${b.heightM}`).toBeGreaterThan(b.h)
  })

  it('keeps every tower once: none duplicated, none silently dropped (B: glyph, spire or folded)', () => {
    const { skyline } = viewOf(id)
    const { stats } = skyline
    expect(stats.dropped).toBe(0)
    expect(stats.glyph + stats.silhouette + stats.folded).toBe(stats.inPlace)
    const drawn = skyline.towers
    for (let i = 0; i < drawn.length; i++) {
      for (let j = i + 1; j < drawn.length; j++) {
        const [a, b] = [drawn[i], drawn[j]]
        const same = Math.hypot(a.dx! - b.dx!, a.dy! - b.dy!) <= .015 && Math.abs(a.heightM - b.heightM) <= .15 * Math.max(a.heightM, b.heightM)
        expect(same, `${a.name} / ${b.name}`).toBe(false)
      }
    }
    // The famous and the ≥ 150 m (at most 10) are full towers.
    for (const t of drawn) if (t.famous || t.heightM >= 150) expect(t.lod === 'glyph' || drawn.filter((o) => o.lod === 'glyph').length === 10).toBe(true)
  })

  it('keeps everything it draws out of the text zones and the dot’s clearing', () => {
    const world = worldAt(id)
    const model = sceneModel(world, BOX)
    const layer = layerOf(world)!
    const [dot, ...text] = model.clear
    for (const item of layer.items) {
      const box = item.kind === 'box' ? { x: item.x - item.w / 2, y: item.top, w: item.w, h: item.foot - item.top }
        : item.kind === 'tower' ? { x: item.x - item.w / 2, y: item.base - item.h, w: item.w, h: item.h }
          : item.kind === 'tree' ? { x: item.tree.x - item.tree.w, y: item.tree.base - item.tree.h, w: 2 * item.tree.w, h: item.tree.h }
            : { x: item.glyph.x - item.glyph.w / 2, y: item.glyph.base - item.glyph.h * item.glyph.scale, w: item.glyph.w, h: item.glyph.h * item.glyph.scale }
      for (const zone of [dot, ...text]) expect(overlap(box, zone), `${item.kind} ${JSON.stringify(box)} ${JSON.stringify(zone)}`).toBe(false)
    }
  })

  it('stands every base on its row, never under the sheet’s edge', () => {
    for (const b of viewOf(id).skyline.boxes) expect(b.foot).toBeLessThanOrEqual(VISIBLE_BOTTOM - SHEET_CLEAR + .01)
  })
})

describe('the frame is the place’s own boundary (C5 item 6)', () => {
  it('cuts Ramat Gan at its own boundary: nothing of Tel Aviv in its place', () => {
    const rg = loaded.get('ramat-gan')!, ta = loaded.get('tel-aviv')!
    const taBounds = placeBounds(ta.place, ta.bounds, 8)!
    const rgBounds = placeBounds(rg.place, rg.bounds, 5)!
    expect(rgBounds.name).toBe('רמת גן')
    expect(taBounds.name).toBe('תל־אביב–יפו')
    const { skyline } = viewOf('ramat-gan')
    const spots = [...skyline.towers, ...skyline.boxes].filter((t) => t.dx !== undefined)
    expect(spots.length).toBeGreaterThan(50)
    // Every spot within Ramat Gan's own boundary; none in Tel Aviv's but along their shared line (the masks' 50 m cells).
    let inTelAviv = 0
    for (const t of spots) {
      expect(boundsHoldKm(rgBounds, rg.place, t.dx!, t.dy!)).toBe(true)
      const lat = rg.place.lat + t.dy! / 111.32, lon = rg.place.lon + t.dx! / (111.32 * Math.cos(rg.place.lat * Math.PI / 180))
      if (taBounds.contains(lat, lon)) inTelAviv++
    }
    expect(inTelAviv / spots.length).toBeLessThan(.02)
    // Its frame is narrower than its built-up cluster's (which ran into Tel Aviv).
    const frame = viewOf('ramat-gan').frame
    const cluster = outsideFrame(rg.city?.clusters, portraitReach(rg.city?.clusters), 187.5, 375, true)
    expect(frame.e - frame.w).toBeLessThan(cluster.e - cluster.w)
  })

  it('falls back to the weighted cell of the place points where no boundary is mapped', () => {
    expect(viewOf('shadmot-mehola').bounds.source).toBe('cell')
  })

  it('draws Tel Aviv’s towers beyond Ramat Gan where they truly are, with the same levels of detail', () => {
    const { beyond } = viewOf('ramat-gan')
    expect(beyond.length).toBeGreaterThan(20)
    expect(beyond.some((t) => t.lod === 'glyph')).toBe(true)
    // Tel Aviv lies west of Ramat Gan: its full towers right of the dot.
    const west = beyond.filter((b) => b.lod === 'glyph' && b.dx! < -1)
    expect(west.length).toBeGreaterThan(2)
    for (const t of west) expect(t.x).toBeGreaterThan(187.5)
  })

  it.each(['ramat-gan', 'tel-aviv', 'haifa'])('%s: towers beyond the place are scaled and hazed by their true distance (C5b)', (id) => {
    const view = viewOf(id)
    const { frame, baseKm, beyond } = view
    const look = lookOf(frame)
    // Never nearer than the place's near edge: no larger a metre than the place's own there, never hazed less.
    const nearK = frame.k * frame.midDepth / (frame.eyeN - frame.n)
    for (const t of beyond) {
      expect(t.h).toBeLessThanOrEqual(Math.max(2, look.px(t.heightM, nearK)) + 1e-6)
      expect(t.km).toBeGreaterThanOrEqual(baseKm - 1e-9)
      // In the outside view's own projection: east left, west right.
      expect(Math.sign(t.x - frame.centerX)).toBe(-Math.sign(t.dx!))
    }
    // A tower beyond stands no taller than the place's own of its height would at the same depth (perspective only).
    for (const t of beyond) {
      const at = frame.k * frame.midDepth / (frame.eyeN - t.dy!)
      expect(t.h).toBeLessThanOrEqual(Math.max(2, look.px(t.heightM, at)) + 1e-6)
    }
  })

  it('no longer lets Tel Aviv’s towers outgrow Ramat Gan’s own (C5: up to 0.48 px a metre against 0.26)', () => {
    const view = viewOf('ramat-gan')
    const perM = (list: { h: number; heightM: number }[]) => list.filter((t) => t.heightM >= 150).map((t) => t.h / t.heightM)
    const own = perM(view.skyline.towers), beyond = perM(view.beyond.filter((t) => t.dx! < -1))
    expect(own.length && beyond.length).toBeTruthy()
    const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]
    expect(median(beyond)).toBeLessThanOrEqual(median(own) * 1.05)
    expect(Math.max(...beyond)).toBeLessThan(1.25 * Math.max(...own))
  })
})

describe('towers beyond the frame (C5 item 3)', () => {
  it('draws Eshkol Tower from Hadar as a full tower, not a stick', () => {
    const eshkol = viewOf('haifa').beyond.find((t) => t.name === 'מגדל אשכול')
    expect(eshkol?.lod).toBe('glyph')
    expect(eshkol!.km).toBeGreaterThan(5)
  })
})

describe('nothing beyond the place stands on a bare skyline the eye cannot see (C9)', () => {
  /** Px the panorama sees of a thing over the near ridge from the eye, at its true bearing and distance. */
  const seenOver = (id: string, dx: number, dy: number, heightM: number) => {
    const terrain = loaded.get(id)!.terrain
    const x = xOf(Math.atan2(dx, dy) * 180 / Math.PI, terrain.camera ?? SCENE_CAMERA) * 375 / (terrain.camera ?? SCENE_CAMERA).width
    const km = Math.hypot(dx, dy)
    if (km <= terrain.sightAt!(x).nearKm) return Infinity
    const seen = terrain.seenAt!(x, km, heightM)
    return seen ? Math.min(seen.groundY, lineAt(terrain.nearPoints, x)) - seen.y : 0
  }

  it('leaves out Safed’s buildings behind the crest over Rosh Pina: the land in front hides them', () => {
    expect(viewOf('rosh-pina').beyond).toEqual([])
  })

  it.each([...CITIES, ...VILLAGES, 'zikhron-yaakov'])('%s: a tower beyond shows no more of itself than the panorama sees', (id) => {
    for (const t of viewOf(id).beyond) {
      const over = seenOver(id, t.dx!, t.dy!, t.heightM)
      expect(over).toBeGreaterThan(2)
      expect(t.h).toBeLessThanOrEqual(Math.max(2, over) + 1e-6)
    }
  })
})

describe('the place’s own ground takes the snow the ridge takes (C9)', () => {
  it.each(['jerusalem', 'rosh-pina'])('%s: snow lies on its near land, on its own scale; none without snow', (id) => {
    const snowy = buildWorld({ ...worldInput(loaded.get(id)!, NOON), forced: { snowfall: 2, precipitation: 2, temperature: -1,
      feelsLike: -4, cloudCover: 100, thickCloud: 100, weatherCode: 73 } })
    const near = (w: WorldState) => sceneModel(w, BOX).layers.find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!
    const snow = near(snowy).light.snow
    expect(snow).not.toBeNull()
    // At the dot the near land is the place's own: its snow runs from the crest down by (crest m − snow line m) × s.
    const { terrain } = snowy, view = snowy.place3 as OutsideView
    const pts = terrain.near.points
    const i = pts.reduce((best, [px], k) => Math.abs(px - view.dot.x) < Math.abs(pts[best][0] - view.dot.x) ? k : best, 0)
    const crestM = terrain.near.elevations![i], lineM = snowy.snow!.lineM
    const edge = terrain.snowEdge!('near', lineM)[i]
    const want = crestM >= lineM ? pts[i][1] + (crestM - lineM) * view.vscale!.s : pts[i][1] - 2
    expect(edge[1]).toBeCloseTo(want, 6)
    expect(near(worldAt(id)).light.snow ?? null).toBeNull()
  })
})

describe('rows climb the slope (C5 item 2)', () => {
  it('sets Haifa’s low city on the bay below its rows on the Carmel', () => {
    const { skyline } = viewOf('haifa')
    const terrain = loaded.get('haifa')!.terrain
    const boxes = skyline.boxes.filter((b) => b.dx !== undefined).map((b) => ({ b, h: terrain.heightNear!(b.dx!, b.dy!)! }))
    const low = boxes.filter(({ h }) => h < 40), high = boxes.filter(({ h }) => h > 200)
    expect(low.length && high.length).toBeTruthy()
    const mean = (list: typeof boxes) => list.reduce((s, { b }) => s + b.foot, 0) / list.length
    expect(mean(low) - mean(high)).toBeGreaterThan(10)
  })

  it.each(['zikhron-yaakov', 'rosh-pina', 'nahalal', 'shadmot-mehola'])('%s stands on its own ground, not on the ridge line’s undulation (C5b)', (id) => {
    const view = viewOf(id)
    const terrain = loaded.get(id)!.terrain
    const ground = groundFn(terrain.nearPoints, 375)
    const boxes = view.skyline.boxes.filter((b) => b.dx !== undefined)
    // Two spots of the same row depth and the same ground stand at the same height wherever the ridge line is.
    const key = (b: typeof boxes[number]) => `${Math.round(b.dy! * 20)}:${Math.round(terrain.heightNear!(b.dx!, b.dy!)! / 2)}`
    const groups = new Map<string, typeof boxes>()
    for (const b of boxes) groups.set(key(b), [...groups.get(key(b)) ?? [], b])
    let pairs = 0
    for (const list of groups.values()) {
      for (let i = 1; i < list.length; i++) {
        if (Math.abs(ground(list[i].x) - ground(list[0].x)) < 1.5) continue
        pairs++
        expect(Math.abs(list[i].foot - list[0].foot), id).toBeLessThan(1.6)
      }
    }
    if (id === 'zikhron-yaakov' || id === 'rosh-pina') expect(pairs, id).toBeGreaterThan(0)
    // Nothing floats: every base on the land as drawn (the place's own near land, owner decision 14's follow-up).
    const drawn = groundFn(worldAt(id).terrain.near.points.map(([x, y]) => [x, y]), 375)
    for (const b of boxes) expect(b.foot, id).toBeGreaterThanOrEqual(drawn(b.x) + 1 - 1.5)
  })

  it('builds Zikhron Ya’akov as a body of houses: several rows stepping up its hill, higher ground higher', () => {
    const view = viewOf('zikhron-yaakov')
    const terrain = loaded.get('zikhron-yaakov')!.terrain
    const boxes = view.skyline.boxes.filter((b) => b.dx !== undefined)
    const feet = boxes.map((b) => b.foot)
    expect(Math.max(...feet) - Math.min(...feet)).toBeGreaterThan(8)
    expect(new Set(feet.map((f) => Math.round(f / 2))).size).toBeGreaterThanOrEqual(4)
    // Within a band of depth, higher ground stands higher on the screen (rank correlation of ground and foot < 0).
    const band = boxes.filter((b) => Math.abs(b.dy!) < .4)
    const hs = band.map((b) => terrain.heightNear!(b.dx!, b.dy!)!)
    const rank = (v: number[]) => { const o = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); o.forEach(([, i], k) => { r[i] = k }); return r as number[] }
    const rh = rank(hs), rf = rank(band.map((b) => b.foot)), n = band.length
    const rho = 1 - 6 * rh.reduce((s, r, i) => s + (r - rf[i]) ** 2, 0) / (n * (n * n - 1))
    expect(rho).toBeLessThan(-.5)
  })

  it('keeps a flat city on its line (Tel Aviv: its rows within the room under the ridge)', () => {
    const view = viewOf('tel-aviv')
    const ground = groundFn(loaded.get('tel-aviv')!.terrain.nearPoints, 375)
    for (const b of view.skyline.boxes) expect(b.foot - ground(b.x)).toBeLessThan(20)
  })
})

describe('the coastal sea (C5 item 1)', () => {
  it.each(['tel-aviv', 'haifa', 'netanya'])('%s has its sea, from the shore out to the true sea horizon (C5b)', (id) => {
    const sea = worldAt(id).water.coastalSea
    expect(sea).not.toBeNull()
    expect(sea!.side).toBe('right')
    expect(Math.max(...sea!.points.map(([x]) => x))).toBeGreaterThanOrEqual(374.9)
    // Its far edge is a level line at the panorama's own sea horizon (eye height, curvature, refraction), never above it.
    expect(sea!.horizon).toBeCloseTo(seaHorizonY(loaded.get(id)!.terrain), 6)
    expect(sea!.top).toBe(sea!.horizon)
    for (const [, y] of sea!.points) expect(y).toBeGreaterThanOrEqual(sea!.horizon - 1e-9)
    expect(sea!.points.filter(([, y]) => Math.abs(y - sea!.horizon) < 1e-9).length).toBeGreaterThanOrEqual(2)
    // Down to the sheet and under it (no lower edge in view); the shore runs from the horizon down, never back up.
    expect(sea!.bottom).toBeGreaterThanOrEqual(VISIBLE_BOTTOM)
    expect(sea!.coast[0][1]).toBe(sea!.horizon)
    for (let i = 1; i < sea!.coast.length; i++) expect(sea!.coast[i][1]).toBeGreaterThanOrEqual(sea!.coast[i - 1][1])
    // Its distance falls from the horizon to the sheet: the haze grades down the water, as C3's does.
    for (let i = 1; i < sea!.km.length; i++) {
      expect(sea!.km[i][0]).toBeGreaterThan(sea!.km[i - 1][0])
      expect(sea!.km[i][1]).toBeLessThanOrEqual(sea!.km[i - 1][1])
    }
    expect(sea!.km[0][1]).toBeGreaterThan(sea!.km.at(-1)![1] * 4)
  })

  it.each(['tel-aviv', 'netanya'])('%s: no slab on the land, the water a perspective toward the horizon (C5b)', (id) => {
    const sea = worldAt(id).water.coastalSea!
    // The shore recedes: far up the water it lies further toward the place's side than at the sheet (a straight edge
    // under a level top would be the old slab's rectangle).
    const xs = sea.coast.map(([x]) => x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(20)
    // Tones by C3's rule for open water: the far water mirrors the low sky, nearer water shows more of its own dark.
    const sea2 = layerOf(worldAt(id))!.sea!
    const lum = (rgb: readonly number[]) => .3 * rgb[0] + .6 * rgb[1] + .1 * rgb[2]
    expect(lum(sea2.stops[0][1])).toBeGreaterThan(lum(sea2.stops.at(-1)![1]))
    expect(sea2.horizon.x1 - sea2.horizon.x0).toBeGreaterThan(5)
  })

  it('keeps Haifa’s bay under its Carmel rows, in front of the city', () => {
    const view = viewOf('haifa')
    const sea = worldAt('haifa').water.coastalSea!
    const terrain = loaded.get('haifa')!.terrain
    const high = view.skyline.boxes.filter((b) => b.dx !== undefined && terrain.heightNear!(b.dx!, b.dy!)! > 200)
    expect(high.length).toBeGreaterThan(20)
    expect(sea.horizon).toBeGreaterThan(Math.max(...high.map((b) => b.foot)))
  })

  it('lays the light’s path toward the setting sun over Tel Aviv’s sea', () => {
    const sea = layerOf(worldAt('tel-aviv', '2026-11-17T16:30'))!.sea!
    expect(sea.glint).not.toBeNull()
    expect(sea.glint!.sparks.length).toBeGreaterThan(3)
  })

  it.each(['jerusalem', 'beer-sheva', 'ramat-gan', 'rosh-pina', 'shadmot-mehola', 'nahalal'])('%s, inland, has none', (id) => {
    expect(worldAt(id).water.coastalSea).toBeNull()
  })
})

describe('one builder for every place: the density continuum (owner, 2026-11-19)', () => {
  const kinds = (id: string) => {
    // The place's own (not the towns beyond it, C9).
    const items = (layerOf(worldAt(id))?.items ?? []).filter((i) => i.kind !== 'box' || !i.beyond)
    return { houses: items.filter((i) => i.kind === 'box' && i.roof).length, blocks: items.filter((i) => i.kind === 'box' && !i.roof).length,
      trees: items.filter((i) => i.kind === 'tree').length }
  }

  it.each(VILLAGES)('%s is built from its own cells: houses with roofs and trees, no blocks', (id) => {
    const k = kinds(id)
    expect(k.houses).toBeGreaterThan(10)
    expect(k.blocks).toBe(0)
  })

  it('reads denser and higher from village to town to city', () => {
    const share = (id: string) => { const k = kinds(id); return k.blocks / Math.max(1, k.blocks + k.houses) }
    expect(share('shadmot-mehola')).toBe(0)
    expect(share('zikhron-yaakov')).toBeLessThan(share('tel-aviv'))
    expect(share('tel-aviv')).toBeGreaterThan(.5)
  })

  it('builds houses only inside the place’s built cells', () => {
    const { skyline } = viewOf('nahalal')
    const cover = loaded.get('nahalal')!.cover!
    const place = loaded.get('nahalal')!.place
    for (const b of skyline.boxes) {
      const lat = place.lat + b.dy! / 111.32, lon = place.lon + b.dx! / (111.32 * Math.cos(place.lat * Math.PI / 180))
      expect(cover.coverAt(lat, lon)).toBe(5)
    }
  })

  it.each(['rosh-pina', 'zikhron-yaakov', 'nahalal', 'shadmot-mehola'])('%s: houses stay legible, composed fewer and larger (C5b)', (id) => {
    const view = viewOf(id)
    const { frame } = view
    const extent = Math.max(-frame.w, frame.e, (frame.n - frame.s) / 2)
    const legible = legibleHouse(extent)
    // The fabric's houses (a folded tower's box has no cell seed).
    const houses = view.skyline.boxes.filter((b) => (b.heightM ?? 0) < HOUSE_TOP_M && b.seed !== undefined)
    expect(houses.length).toBeGreaterThan(10)
    for (const b of houses) {
      const persp = frame.k * frame.midDepth / (frame.eyeN - b.dy!) / frame.k
      expect(b.w).toBeGreaterThanOrEqual(legible.w * persp - 1e-6)
      // A two-storey house at least the legible height (in its perspective).
      if ((b.heightM ?? 0) >= 2 * STOREY_M + 1.5) expect(b.foot - b.top).toBeGreaterThanOrEqual(legible.h * persp - 1e-6)
    }
    // Rosh Pina's are no longer 2–3 px.
    if (id === 'rosh-pina') expect(houses.map((b) => b.w).sort((a, b) => a - b)[Math.floor(houses.length / 2)]).toBeGreaterThan(3.5)
  })

  it('sizes the legible house continuously with the place: smaller for larger places, never a step', () => {
    let last = legibleHouse(0)
    for (let e = .1; e <= 8; e += .1) {
      const h = legibleHouse(e)
      expect(h.w).toBeLessThanOrEqual(last.w + 1e-9)
      expect(last.w - h.w).toBeLessThan(.1)
      last = h
    }
  })

  it('keeps every height in its true order under the legible sizes (a 300 m tower over a 90 m one over a house)', () => {
    const { frame } = viewOf('tel-aviv')
    const look = lookOf(frame)
    const hs = [3, 7.5, 12, 12.5, 13, 30, 90, 300].map((m) => look.px(m, frame.k))
    for (let i = 1; i < hs.length; i++) expect(hs[i]).toBeGreaterThan(hs[i - 1])
    // A tower stands about as tall as by the true perspective (only its lowest storeys take the legible floor).
    expect(look.px(300, frame.k) / (300 * frame.k)).toBeLessThan(1.1)
  })

  it('draws nothing where a place has no built cells', () => {
    expect((layerOf(worldAt('ramon-crater'))?.items ?? []).filter((i) => i.kind === 'box').length).toBe(0)
  })
})

describe('the variant B counts of the skyline study (SKYLINE.md), with the study’s frame', () => {
  it.each([['tel-aviv', [10, 54, 237]], ['haifa', [6, 9, 90]], ['jerusalem', [3, 8, 81]]] as const)('%s: glyph / spire / folded', async (id, counts) => {
    const { place, terrain, city } = loaded.get(id)!
    // The study's pool: the SVG scene's panorama marks (their famous high-rises give the towers their fame).
    const landmarks = (await loadLandmarkSource(place, new AbortController().signal, { israel: loadIsrael })).panoramaMarks
    const reachKm = portraitReach(city?.clusters)
    const frame = outsideFrame(city?.clusters, reachKm, Number.parseFloat(terrain.centerLeft) / 100 * 375, 375, true)
    const out = outsideSkyline({ place, towers: city?.raster?.towers ?? city?.towers ?? [], landmarks,
      raster: city?.raster ?? undefined, frame, ground: groundFn(terrain.nearPoints, 375), floor: VISIBLE_BOTTOM - SHEET_CLEAR, width: 375 })
    // The study's stills were made on the live panorama in the app; the recorded fixture's ridge differs by a fraction of
    // a px here and there, which moves a spire or two across the 7 px rise: the counts within 2 of the study's.
    const got = [out.stats.glyph, out.stats.silhouette, out.stats.folded]
    got.forEach((n, i) => expect(Math.abs(n - counts[i]), `${got} vs ${counts}`).toBeLessThanOrEqual(2))
    expect(out.stats.glyph + out.stats.silhouette + out.stats.folded).toBe(counts[0] + counts[1] + counts[2])
  })
})

describe('marks beyond the place and industrial landmarks (C5 item 5, the far-mark rule)', () => {
  it('keeps beyond any place only landmarks: a name and fame, or ≥ 200 m', () => {
    for (const id of [...CITIES, ...VILLAGES]) {
      const world = worldAt(id)
      const { landmarks, place, city } = loaded.get(id)!
      const reach = portraitReach(city?.clusters)
      for (const mark of world.marks) {
        const source = landmarks.find((l) => l.id === mark.id)
        if (!source || distanceOf(place, source) <= Math.max(reach + 1, 6)) continue
        expect(landmarkBeyond(industrialNamed(source)), `${id}: ${mark.id}`).toBe(true)
      }
    }
  })

  it('drops Rosh Pina’s unnamed Golan turbines from the canvas, and leaves the SVG pool as it was', () => {
    expect(worldAt('rosh-pina').marks.some((m) => m.glyphKind === 'turbine')).toBe(false)
    const raw: Landmark[] = [{ id: 't', kind: 'turbine', lat: 32.98, lon: 35.8, heightM: 120, source: 'osm' }]
    const place = loaded.get('rosh-pina')!.place
    expect(panoramaShortlist(place, raw).map((m) => m.id)).toEqual(['t'])
    expect(panoramaShortlist(place, raw, false, 'landmark')).toEqual([])
  })

  it('reads a name as a name only when it is one', () => {
    expect(nameIsName('לבניה')).toBe(false)
    expect(nameIsName('בבנייה')).toBe(false)
    expect(nameIsName('ארובה')).toBe(false)
    expect(nameIsName('חברת החשמל', { operator: 'חברת החשמל' })).toBe(false)
    expect(nameIsName('תחנת הכוח רידינג')).toBe(true)
    // The word is a proper name when the object's own article carries it: Haifa's pair of cooling towers, "הלבניות".
    expect(nameIsName('לבניה', { titles: ['הלבניות'] })).toBe(true)
    expect(nameIsName('לבניה', { titles: ['מגדל קירור'] })).toBe(false)
  })

  it('keeps Haifa’s cooling tower a landmark by its own data (its article, הלבניות), not by a fix', () => {
    const cooling = worldAt('haifa').marks.find((m) => m.glyphKind === 'cooling')
    expect(cooling?.named).toBe(true)
    const unnamed = industrialNamed({ kind: 'cooling', nameHe: 'לבניה' as string | undefined, fame: undefined })
    expect(unnamed.nameHe).toBeUndefined()
  })
})

describe('light on the place', () => {
  it('lights the place’s faces from the true sun’s side at every hour', () => {
    for (const at of ['2026-11-17T08:00', '2026-11-17T11:00', '2026-11-17T16:30'] as LocalTime[]) {
      const world = worldAt('tel-aviv', at)
      const { shine } = layerOf(world)!
      if (Math.abs(world.light.across) > 0.05) expect(Math.sign(shine.cast.dx)).toBe(-Math.sign(world.light.across))
    }
  })

  it.each(['tel-aviv', 'jerusalem', 'beer-sheva'])('%s: gives the mass form from the sky under the cloud: tops lighter, feet darker (C5b, C9)', (id) => {
    for (const at of ['2026-11-17T11:00', '2026-11-17T16:30'] as LocalTime[]) {
      const world = worldAt(id, at)
      const layer = layerOf(world)!
      const lum = (rgb: readonly number[]) => .3 * rgb[0] + .6 * rgb[1] + .1 * rgb[2]
      // The weaker the direct light, the more the form is the sky's.
      expect(layer.form.strength).toBeGreaterThan(.35 * (1 - world.night.dark))
      const sky = skyAt(world, BOX)(8)
      layer.form.tiers.forEach((t, i) => {
        expect(lum(t.top)).toBeGreaterThanOrEqual(lum(layer.tiers[i].wall))
        expect(lum(t.foot)).toBeLessThan(lum(layer.tiers[i].wall))
        expect(lum(t.face)).toBeGreaterThanOrEqual(lum(layer.tiers[i].wall))
        // C9: a wall gives back its albedo's share of the sky it faces, never the sky's own light.
        expect(lum(t.top)).toBeLessThan(lum(sky))
      })
      // The brighter half of the sky is the sun's: its side on the screen.
      const sun = world.bodies.sun.x - 187.5
      if (Math.abs(sun) > 20) expect(layer.form.side).toBe(sun < 0 ? 1 : -1)
    }
    expect(layerOf(worldAt(id, '2026-11-17T21:00'))!.form.strength).toBeLessThan(.05)
  })

  it.each(['jerusalem', 'tel-aviv', 'haifa', 'beer-sheva'])('%s: against the light the mass is a dark silhouette on its ridge (C9)', (id) => {
    const lum = (rgb: readonly number[]) => .3 * rgb[0] + .6 * rgb[1] + .1 * rgb[2]
    const worst = (at: LocalTime) => {
      const world = worldAt(id, at)
      const layer = layerOf(world)!
      const behind = landBehind(world)
      let most = -1, seen = 0
      for (const item of layer.items) {
        if (item.kind !== 'box' || item.beyond) continue
        const km = behind(item.x, item.foot)
        if (!Number.isFinite(km)) continue
        seen++
        most = Math.max(most, lum(layer.tiers[item.tier].wall) - lum(toneAt(world, km)))
      }
      expect(seen).toBeGreaterThan(50)
      return { most, against: againstLight(world) }
    }
    // A low sun beyond the land: the walls the eye sees face away from it, about the ridge's own dark.
    for (const at of ['2026-11-17T06:20', '2026-11-17T16:30'] as LocalTime[]) {
      const { most, against } = worst(at)
      expect(against).toBeGreaterThan(.8)
      expect(most, at).toBeLessThan(.05)
    }
    // A high sun: lit stone, lighter than the scrub round it.
    const noon = worst('2026-11-17T11:00')
    expect(noon.against).toBeLessThan(.2)
    expect(noon.most).toBeGreaterThan(.08)
  })

  it('takes no more haze on a thing than the land it is seen against (C9)', () => {
    for (const id of CITIES) {
      const world = worldAt(id)
      const behind = landBehind(world)
      const near = world.terrain.near
      // Under the near crest: no farther than that land (the place's own ground over it, nearer still); over every crest:
      // the sky's (no bound).
      const i = Math.floor(near.points.length / 2)
      const [x, crest] = near.points[i]
      expect(behind(x, crest + 10)).toBeLessThanOrEqual((near.hazeKm ?? near.distanceKm)[i] + 1e-6)
      expect(behind(x, -50)).toBe(Infinity)
      // Every box seen against the land takes the haze of a distance (the layer's 0.5 km steps) no farther than that land.
      const layer = layerOf(world)!
      const walls = new Map<number, string>()
      const wallAt = (q: number) => { if (!walls.has(q)) walls.set(q, JSON.stringify(tonesAt(world, q).wall)); return walls.get(q)! }
      for (const item of layer.items.filter((i) => i.kind === 'box').slice(0, 400)) {
        if (item.kind !== 'box') continue
        const km = behind(item.x, item.foot)
        if (!Number.isFinite(km)) continue
        const wall = JSON.stringify(layer.tiers[item.tier].wall)
        let found = false
        for (let q = 0; q <= Math.round(km / .5) * .5 + 1e-9 && !found; q += .5) found = wallAt(q) === wall
        expect(found, `${id} box at ${item.x.toFixed(0)}`).toBe(true)
      }
    }
  })

  it('lights windows by night only, and hazes the far rows toward the air', () => {
    expect(layerOf(worldAt('tel-aviv', '2026-11-17T11:00'))!.shine.windows).toBe(0)
    expect(layerOf(worldAt('tel-aviv', '2026-11-17T21:00'))!.shine.windows).toBeGreaterThan(.2)
    const world = worldAt('tel-aviv', '2026-11-17T11:00')
    const { frame, baseKm } = viewOf('tel-aviv')
    const lum = (rgb: readonly number[]) => .3 * rgb[0] + .6 * rgb[1] + .1 * rgb[2]
    const near = tonesAt(world, rowKm(frame, baseKm, frame.n)), far = tonesAt(world, rowKm(frame, baseKm, frame.s))
    expect(rowKm(frame, baseKm, frame.s)).toBeGreaterThan(rowKm(frame, baseKm, frame.n))
    expect(Math.abs(lum(far.wall) - lum(far.mist))).toBeLessThan(Math.abs(lum(near.wall) - lum(near.mist)))
  })

  it('places its marks among the mass by the same projection (east left)', () => {
    const { landmarks, place } = loaded.get('jerusalem')!
    const world = worldAt('jerusalem')
    const { frame } = viewOf('jerusalem')
    for (const mark of world.marks.filter((m) => m.portrait)) {
      const source = landmarks.find((l) => l.id === mark.id)
      if (!source || source.source === 'place') continue
      const { dx } = offsetKm(place, source)
      if (Math.abs(dx) > .3) expect(Math.sign(mark.x - frame.centerX)).toBe(-Math.sign(dx))
    }
  })
})
