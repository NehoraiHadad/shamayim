import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { DATUM_PLACES, SCENE_PLACES, STILL_PLACES } from '../../test/scenePlaces'
import type { OutsideView } from '../../world/types'
import { buildWorld } from '../../world/world'
import { outsideLayer } from './outside'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const IDS = ['shadmot-mehola', 'beit-shean', 'rosh-pina', 'zikhron-yaakov', 'tiberias', 'ein-gedi', 'neve-zohar', 'nahalal', 'haifa', 'jerusalem', 'tel-aviv']
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces([...SCENE_PLACES, ...STILL_PLACES, ...DATUM_PLACES].filter(p => IDS.includes(p.id)))
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })
const med = (a: number[]) => a.length ? a.sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN
const S = 8
it('prints', () => {
  const ms = new Map<string, number[]>()
  for (let i = 0; i < 7; i++) for (const id of IDS) {
    const input = worldInput(places.get(id)!, '2026-11-17T12:00')
    const t = performance.now(); buildWorld(input)
    ms.set(id, [...(ms.get(id) ?? []), performance.now() - t])
  }
  for (const id of IDS) {
    const world = buildWorld(worldInput(places.get(id)!, '2026-11-17T12:00'))
    const { frame, skyline } = world.place3 as OutsideView
    const items = outsideLayer(world, BOX)!.items.flatMap(i => i.kind === 'box' && !i.beyond ? [i] : [])
    const grid = new Uint8Array(375 * S * 250 * S)
    const W = 375 * S, H = 250 * S
    let area = 0, house = 0
    for (const b of items) {
      const x0 = Math.max(0, Math.round((b.x - b.w / 2) * S)), x1 = Math.min(W, Math.round((b.x + b.w / 2) * S))
      const y0 = Math.max(0, Math.round((b.top + 60) * S)), y1 = Math.min(H, Math.round((b.foot + 60) * S))
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!grid[y * W + x]) { grid[y * W + x] = 1; area++; if (b.roof) house++ }
    }
    const low = skyline.boxes.filter(b => b.heightM! < 12.5), tall = skyline.boxes.filter(b => b.heightM! >= 12.5 && b.seed !== undefined)
    const hw = (a: typeof low) => med(a.map(b => (b.foot - b.top) / b.w)).toFixed(2)
    console.log('TOWN ' + id + ' km ' + (frame.e - frame.w).toFixed(2) + ' area/km ' + (area / S / S / (frame.e - frame.w)).toFixed(1)
      + ' boxes ' + skyline.boxes.length + ' low ' + low.length + ' tall ' + tall.length + ' items ' + items.length + ' houses ' + items.filter(b => b.roof).length
      + ' hw low ' + hw(low) + ' tall ' + hw(tall) + ' >3 ' + tall.filter(b => (b.foot - b.top) / b.w > 3).length
      + ' towers ' + skyline.towers.length + ' seeds ' + skyline.towers.map(t => t.seed % 9973).sort((a, b) => a - b).join(',')
      + ' storeys27 ' + (a => a.reduce((t, b) => t + Math.round((b.heightM! - 1) / 3), 0) / a.length)(tall.filter(b => b.heightM! <= 27)).toFixed(2) + ' ms ' + med(ms.get(id)!).toFixed(0))
  }
  for (const id of IDS) {
    const { frame, skyline } = buildWorld(worldInput(places.get(id)!, '2026-11-17T12:00')).place3 as OutsideView
    const houses = skyline.boxes.filter(b => b.heightM! < 12.5 && b.seed !== undefined)
    const flat = houses.map(b => ({ w: +b.w.toFixed(1), h: +(b.foot - b.top).toFixed(1), m: +b.heightM!.toFixed(1), near: +b.near.toFixed(2) })).sort((a, b) => b.w / b.h - a.w / a.h)
    const blocks = skyline.boxes.filter(b => b.heightM! >= 12.5 && b.seed !== undefined).map(b => ({ w: +b.w.toFixed(1), h: +(b.foot - b.top).toFixed(1), m: +b.heightM!.toFixed(1) })).sort((a, b) => b.w / b.h - a.w / a.h)
    console.log('WIDE ' + id + ' k ' + frame.k.toFixed(4) + ' houses w/h max ' + JSON.stringify(flat.slice(0, 2)) + ' widest ' + JSON.stringify([...flat].sort((a, b) => b.w - a.w)[0])
      + ' n w/h>3: ' + flat.filter(b => b.w / b.h > 3).length + ' of ' + flat.length + ' blocks ' + JSON.stringify(blocks.slice(0, 2)))
    const city = places.get(id)!.city
    const squares = new Map<string, { b: number; l: number; p: number; f: number; t: string[] }>()
    for (const t of city?.towers ?? []) {
      const at = city!.raster?.at(t.lat, t.lon)
      if (!at || at.built >= .2) continue
      const key = Math.floor(t.lat * 480) + ':' + Math.floor(t.lon * 800)
      const s = squares.get(key) ?? { b: Math.round(at.built * 15), l: at.levels, p: at.p90, f: Math.round(city!.raster!.front!(t.lat, t.lon)), t: [] }
      s.t.push(t.heightM + 'm' + t.wClass)
      squares.set(key, s)
    }
    console.log('SPARSE ' + id + ' ' + [...squares.values()].map(s => s.b + '/15 l' + s.l + ' p' + s.p + ' f' + s.f + ' [' + s.t.join(',') + ']').join(' ; '))
  }
  expect(1).toBe(1)
}, 300_000)
