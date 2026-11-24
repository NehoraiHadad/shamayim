import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { StoredPanorama } from '../data/terrain/panorama'
import { sceneModel } from '../scene/model'
import { layoutOf } from '../scene/model/layout'
import { outsideShape } from '../scene/model/outsideShape'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import * as heightSolver from './heightLabel'
import { DOT_R, overlaps, VISIBLE_BOTTOM, type Box } from './layout'
import { heightLabelBox, hits, sceneClearance, type ScreenBox } from './sceneClearance'
import { SCENE_W } from './sceneBox'
import { buildWorld } from './world'

const BOX = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const WIDTHS = [320, 360, SCENE_W, 430, 520]
const records = import.meta.glob<StoredPanorama>('../test/fixtures/scene/*.panorama.json', { eager: true, import: 'default' })
const places = [...SCENE_PLACES, ...DATUM_PLACES, ...STILL_PLACES, ...SKYLINE_STUDY_PLACES, ...VILLAGE_PLACES]
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(places)
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const rect = ({ x, y, w, h }: ScreenBox) => ({ left: x, right: x + w, top: y, bottom: y + h })
const signature = (...geometry: number[]) => geometry.join()

function unionArea(boxes: readonly Box[], clip: Box) {
  const inside = boxes.filter(b => overlaps(b, clip)).map(b => ({
    left: Math.max(b.left, clip.left), right: Math.min(b.right, clip.right),
    top: Math.max(b.top, clip.top), bottom: Math.min(b.bottom, clip.bottom),
  })).sort((a, b) => a.top - b.top)
  const xs = [...new Set(inside.flatMap(b => [b.left, b.right]))].sort((a, b) => a - b)
  let area = 0
  for (let i = 1; i < xs.length; i++) {
    let bottom = clip.top
    for (const b of inside) if (b.left < xs[i] && b.right > xs[i - 1]) {
      area += (xs[i] - xs[i - 1]) * Math.max(0, b.bottom - Math.max(bottom, b.top))
      bottom = Math.max(bottom, b.bottom)
    }
  }
  return area
}

it.each(places)('$id preserves the fabric and keeps its badge clear across viewport widths', ({ id }) => {
  const loadedPlace = loaded.get(id)!
  const elevation = records[`../test/fixtures/scene/${id}.panorama.json`].groundM
  const at = (time: '12:00' | '21:00') => {
    const input = worldInput(loadedPlace, `2026-11-17T${time}`)
    return buildWorld({ ...input, forecast: { ...input.forecast, elevation } })
  }
  const solve = vi.spyOn(heightSolver, 'besideDot')
  const { built: world, spot } = (() => {
    try {
      const built = at('12:00')
      const spot = solve.mock.results[0]?.value as ReturnType<typeof heightSolver.besideDot>
      if (!spot) throw new Error(`Missing tethered badge for ${id}`)
      return { built, spot }
    }
    finally { solve.mockRestore() }
  })()
  const view = world.place3
  if (view.kind !== 'outside') throw new Error(`Missing outside view for ${id}`)
  const { dot } = view
  const { height, notes, datum } = world.labels

  for (const width of WIDTHS) {
    const sx = width / SCENE_W
    const box = { ...BOX, width }
    const noteZones = notes.map(n => ({ x: n.left * sx, y: n.top, w: n.width, h: n.height }))
    const clear = sceneClearance(world.labels, dot, width)
    expect(clear).toEqual([{ x: dot.x * sx - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R }, ...noteZones])
    const placed = outsideShape(world, box, clear).items
    const clearOfNotes = (x: number, half: number, top: number, bottom: number) =>
      !hits(noteZones, x - half, top, x + half, bottom)
    const expected = [
      ...view.skyline.boxes.filter(b => clearOfNotes(b.x * sx, b.w * sx / 2, b.top, b.foot))
        .map(b => signature(b.x * sx, b.w * sx, b.top, b.foot)),
      ...view.skyline.towers.filter(t => clearOfNotes(t.x * sx, t.w / 2, t.baseY - t.h, t.baseY))
        .map(t => signature(t.x * sx, t.w, t.baseY - t.h, t.baseY)),
      ...view.trees.filter(t => clearOfNotes(t.x * sx, t.w, t.base - t.h, t.base))
        .map(t => signature(t.x * sx, t.w, t.base - t.h, t.base)),
    ]
    const own = placed.flatMap(item => {
      if (item.kind === 'box' && !item.beyond) return [signature(item.x, item.w, item.top, item.foot)]
      if (item.kind === 'tower' && view.skyline.towers.some(t => t.seed === item.seed)) {
        return [signature(item.x, item.w, item.base - item.h, item.base)]
      }
      if (item.kind === 'tree') {
        const t = item.tree
        return [signature(t.x, t.w, t.base - t.h, t.base)]
      }
      return []
    })
    expect(own.sort()).toEqual(expected.sort())

    const badge = rect(heightLabelBox(height, width))
    const overlay = layoutOf(world, box).overlay.find(item => item.kind === 'height')
    expect(overlay).toBeDefined()
    if (!overlay) throw new Error(`Missing height badge at ${width}px`)
    const x = dot.x * sx
    const edgeX = Math.max(badge.left, Math.min(x, badge.right))
    const edgeY = Math.max(badge.top, Math.min(dot.y, badge.bottom))
    const gap = Math.hypot(edgeX - x, edgeY - dot.y) - DOT_R
    expect(gap).toBeGreaterThanOrEqual(2 - 1e-6)
    expect(gap).toBeLessThanOrEqual(34 + 1e-6)
    if (width === SCENE_W) {
      const { candidates, rasterCells, marks, fabric } = spot
      const side = badge.bottom <= dot.y ? 'above' : badge.top >= dot.y ? 'below' : spot.x < x ? 'left' : 'right'
      console.log(JSON.stringify({ place: id, side, distance: gap, marks, fabric, candidates, rasterCells }))
      // The 34 px rim tether bounds the lattice at 520 px and all six prefix grids.
      const diameter = 2 * (DOT_R + 34), w = badge.right - badge.left, h = badge.bottom - badge.top
      expect(candidates).toBeLessThanOrEqual((Math.floor((diameter + w) / (520 / SCENE_W)) + 1) * (Math.floor(diameter + h) + 1))
      expect(rasterCells).toBeLessThanOrEqual(6 * (Math.ceil(diameter + 2 * w) + 2) * (Math.ceil(diameter + 2 * h) + 2))
    }
    expect(Boolean(overlay.leader)).toBe(gap > 12)
    if (overlay.leader) {
      const { x1, y1, x2, y2 } = overlay.leader
      expect([x2, y2]).toEqual([edgeX, edgeY])
      expect(Math.hypot(x1 - x, y1 - dot.y)).toBeCloseTo(DOT_R, 6)
      expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(gap, 6)
    }

    expect(badge.left).toBeGreaterThanOrEqual(2 - 1e-6)
    expect(badge.right).toBeLessThanOrEqual(width - 2 + 1e-6)
    expect(badge.top).toBeGreaterThanOrEqual(2 - 1e-6)
    expect(badge.bottom).toBeLessThanOrEqual(VISIBLE_BOTTOM - 2 + 1e-6)
    expect(noteZones.filter(n => overlaps(rect(n), badge, -1e-6))).toEqual([])
    expect((datum?.segments ?? []).filter(s => overlaps({
      left: s.x1 * sx, right: s.x2 * sx, top: datum!.y - 1, bottom: datum!.y + 1,
    }, badge, -1e-6))).toEqual([])
    const far = sceneModel(world, box).layers.flatMap(layer => layer.kind === 'marks' ? layer.glyphs : [])
    const glyphs = [...far, ...placed.flatMap(item => item.kind === 'mark' ? [item.glyph] : [])]
    const coveredMarks = glyphs.flatMap(m => {
      return overlaps({ left: m.x - m.w / 2, right: m.x + m.w / 2, top: m.base - m.h * m.scale, bottom: m.base }, badge, -1e-6)
        ? [m.kind] : []
    })
    expect(coveredMarks.length, coveredMarks.join()).toBeLessThanOrEqual(id === 'tel-aviv' ? 1 : 0)

    if (id === 'karmei-tzur' && width === SCENE_W) {
      expect(height.x).toBeCloseTo(dot.x, 6)
      expect(badge.bottom).toBeLessThan(dot.y)
      expect(gap).toBeGreaterThanOrEqual(6)
      expect(gap).toBeLessThanOrEqual(7)
      expect(overlay.leader).toBeNull()
    }

    if (loadedPlace.place.settlementType !== 'city') {
      const fabric = placed.flatMap(b => b.kind === 'box' && !b.beyond ? [{
        left: b.x - b.w / 2 - (b.roof === 'tile' ? .5 : 0), right: b.x + b.w / 2 + (b.roof === 'tile' ? .5 : 0),
        top: b.top - (b.roof === 'tile' ? 3 : b.heater ? 1 : 0), bottom: b.foot,
      }] : [])
      const total = unionArea(fabric, { left: 0, right: width, top: 0, bottom: BOX.landHeight })
      expect(unionArea(fabric, badge)).toBeLessThanOrEqual(total * .01)
    }
  }
  expect(at('21:00').labels.height).toEqual(height)
}, 120_000)
