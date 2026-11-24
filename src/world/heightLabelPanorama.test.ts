import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { StoredPanorama } from '../data/terrain/panorama'
import { sceneModel } from '../scene/model'
import { layoutOf } from '../scene/model/layout'
import { outsideShape } from '../scene/model/outsideShape'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import * as heightSolver from './heightLabel'
import { DOT_R, overlaps, VISIBLE_BOTTOM, type Box } from './layout'
import { heightLabelBox, sceneClearance, type ScreenBox } from './sceneClearance'
import { SCENE_W } from './sceneBox'
import { buildWorld } from './world'
import { glyphBox, tallyLeader, unquantizedSpot } from '../test/heightLabelDiagnostics'

const BOX = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const WIDTHS = [320, 360, SCENE_W, 430, 520]
const records = import.meta.glob<StoredPanorama>('../test/fixtures/scene/*.panorama.json', { eager: true, import: 'default' })
const places = [...SCENE_PLACES, ...DATUM_PLACES, ...STILL_PLACES, ...SKYLINE_STUDY_PLACES, ...VILLAGE_PLACES]
let loaded: Map<string, LoadedPlace>
const audited = [320, SCENE_W, 520]
const crossings = audited.map(width => ({ width, places: 0, any: 0, note: 0, datum: 0, mark: 0 }))

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(places)
}, 120_000)
afterAll(() => {
  vi.unstubAllGlobals()
  console.log(JSON.stringify({ leaderCrossings: crossings }))
})

const rect = ({ x, y, w, h }: ScreenBox) => ({ left: x, right: x + w, top: y, bottom: y + h })

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
  const { built: world, spot, args } = (() => {
    try {
      const built = at('12:00')
      const spot = solve.mock.results[0]?.value as ReturnType<typeof heightSolver.besideDot>
      if (!spot) throw new Error(`Missing tethered badge for ${id}`)
      return { built, spot, args: solve.mock.calls[0] }
    }
    finally { solve.mockRestore() }
  })()
  const view = world.place3
  if (view.kind !== 'outside') throw new Error(`Missing outside view for ${id}`)
  const { dot } = view
  const { height, notes, datum } = world.labels
  const raw = unquantizedSpot(args)
  if (raw && (raw.x !== spot.x || raw.y !== spot.y)) console.log(JSON.stringify({ place: id, quantization: [[raw.x, raw.y], [spot.x, spot.y]] }))
  for (const width of WIDTHS) {
    const sx = width / SCENE_W
    const box = { ...BOX, width }
    const noteZones = notes.map(n => ({ x: n.left * sx, y: n.top, w: n.width, h: n.height }))
    const clear = sceneClearance(world.labels, dot, width)
    expect(clear).toEqual([{ x: dot.x * sx - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R }, ...noteZones])
    const placed = outsideShape(world, box, clear).items
    const withoutBadge = { ...world, labels: { ...world.labels, height: { ...height, x: -SCENE_W, backed: false } } }
    const unbacked = outsideShape(withoutBadge, box, clear).items
    expect(placed.filter(item => item.kind !== 'mark')).toEqual(unbacked.filter(item => item.kind !== 'mark'))

    const badge = rect(heightLabelBox(height, width))
    const overlay = layoutOf(world, box).overlay.find(item => item.kind === 'height')
    if (!overlay) throw new Error(`Missing height badge at ${width}px`)
    const x = dot.x * sx
    const edgeX = Math.max(badge.left, Math.min(x, badge.right))
    const edgeY = Math.max(badge.top, Math.min(dot.y, badge.bottom))
    const gap = Math.hypot(edgeX - x, edgeY - dot.y) - DOT_R
    expect(gap).toBeGreaterThanOrEqual(2 - 1e-6)
    expect(gap).toBeLessThanOrEqual(34 + 1e-6)
    if (width === SCENE_W) {
      const { rasterCells, marks, fabric, beyond } = spot
      const side = badge.bottom <= dot.y ? 'above' : badge.top >= dot.y ? 'below' : spot.x < x ? 'left' : 'right'
      console.log(JSON.stringify({ place: id, side, distance: gap, x: spot.x, y: spot.y, marks, fabric, beyond, rasterCells }))
      // Fixed recorded budgets, tightened from the previous ceilings for two-digit and longer elevations.
      expect(rasterCells).toBeLessThanOrEqual(Math.abs(elevation) < 100 ? 94_000 : 101_000)
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
    const datumBoxes = (datum?.segments ?? []).map(s => ({
      left: s.x1 * sx, right: s.x2 * sx, top: datum!.y - 1, bottom: datum!.y + 1,
    }))
    expect(datumBoxes.filter(b => overlaps(b, badge, -1e-6))).toEqual([])
    const far = sceneModel(world, box).layers.flatMap(layer => layer.kind === 'marks' ? layer.glyphs : [])
    const glyphs = [...far, ...placed.flatMap(item => item.kind === 'mark' ? [item.glyph] : [])]
    const count = crossings.find(row => row.width === width)
    if (count) {
      tallyLeader(count, overlay.leader, noteZones.map(rect), datumBoxes, glyphs)
      const drawn = new Set(glyphs.map(g => g.sourceId))
      const baselineFar = sceneModel(withoutBadge, box).layers.flatMap(layer => layer.kind === 'marks' ? layer.glyphs : [])
      const original = [...baselineFar, ...unbacked.flatMap(item => item.kind === 'mark' ? [item.glyph] : [])]
      const dropped = original.filter(g => !drawn.has(g.sourceId)).map(g => g.sourceId)
      if (dropped.length) console.log(JSON.stringify({ place: id, width, badgeDrops: dropped }))
    }

    expect(glyphs.filter(m => overlaps(glyphBox(m), badge, -1e-6)).map(m => m.sourceId)).toEqual([])
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
