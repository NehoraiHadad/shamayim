import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { deltaE } from '../../theme/oklab'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { groundAt as lineAt } from '../../world/sceneLight'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { paintPlane } from '../paint/planes'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { layersOn, sceneModel } from '.'
import { azimuthAt, lateral } from '../../domain/camera'
import { albedoLinear, linearRgbToSrgb, shadeLinearRgb } from './landRadiance'
import { HAZE_SLOPE, hazeAlong, hazeOf, toneAt } from './landVeil'
import { hexOf } from './tone'
import type { LayerOf, RGB, SceneBox, SceneModel } from './types'

/** Stage C2 (docs/design/CANVAS-SCENE-PLAN.md §4): the planes in the enriched hand, structurally. */
const DAY = '2026-11-17'
const HOURS = ['06:20', '08:00', '12:00', '15:00', '16:30', '21:00']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

const at = (hour: string) => `${DAY}T${hour}` as LocalTime
const world = (id: string, hour: string, forced: WorldInput['forced'] = null) =>
  buildWorld({ ...worldInput(loaded.get(id)!, at(hour)), forced })
const planesOf = (model: SceneModel) => layersOn(model, 'land').filter((l): l is LayerOf<'plane'> => l.kind === 'plane')
const near = (model: SceneModel) => planesOf(model).find((l) => l.plane === 'near')!
const far = (model: SceneModel) => planesOf(model).find((l) => l.plane === 'far')!
/** Rendered tones along a plane crest from `litField` (exact single-pass linear lighting + per-sample Koschmieder haze). */
const renderedTones = (layer: LayerOf<'plane'>): [number, RGB][] => {
  const lf = layer.light.litField
  if (!lf) return []
  const rho = albedoLinear(layer.fill)
  const out: [number, RGB][] = []
  for (let c = 0; c < lf.cols; c++) {
    const x = layer.bounds.x + (c / Math.max(1, lf.cols - 1)) * layer.bounds.w
    const o = c * 4
    const rgb = linearRgbToSrgb(shadeLinearRgb(
      rho, lf.eSun, lf.eMoon, lf.eSky, lf.grid[o] / 255, lf.grid[o + 1] / 255, lf.grid[o + 2] / 255,
      lf.yHorizon, lf.grid[o + 3] / 255, lf.hazeLin,
    ))
    out.push([x, rgb])
  }
  return out
}

/**
 * Mean lit-band depth on steep crest segments facing the active source in each column's own bearing frame
 * (`toward`) versus steep segments turned away from the source (`away`), respecting the 250° turning panorama.
 */
function litByLocalFacing(layer: LayerOf<'plane'>, w: WorldState) {
  const ridge = layer.outline.slice(0, -2)
  const lit = new Map<number, number>()
  for (const wash of layer.light.lit) wash.top.forEach(([x], i) => lit.set(Math.round(x * 10), wash.depth[i]))
  const byMoon = w.light.shares.moon > w.light.shares.sun
  const body = byMoon ? w.bodies.moon : w.bodies.sun
  const sums = { toward: 0, towardN: 0, away: 0, awayN: 0 }
  for (let i = 1; i < ridge.length; i++) {
    const [ax, ay] = ridge[i - 1], [bx, by] = ridge[i]
    const slope = (by - ay) / (bx - ax || 1)
    if (Math.abs(slope) <= 0.3) continue
    const midX = (ax + bx) / 2
    const bearing = azimuthAt(midX / BOX.width, w.camera)
    const lat = lateral(body.azimuth, { ...w.camera, heading: bearing })
    if (Math.abs(lat) <= 0.3) continue
    const d = ((lit.get(Math.round(ax * 10)) ?? 0) + (lit.get(Math.round(bx * 10)) ?? 0)) / 2
    // `slope < -0.3` rises to screen-right (faces left); lit when local `lat < 0` (source to screen-left).
    const facesLight = (slope < 0 && lat < 0) || (slope > 0 && lat > 0)
    if (facesLight) { sums.toward += d; sums.towardN++ } else { sums.away += d; sums.awayN++ }
  }
  return {
    toward: sums.toward / (sums.towardN || 1),
    away: sums.away / (sums.awayN || 1),
    n: Math.min(sums.towardN, sums.awayN),
  }
}

describe.each(SCENE_PLACES)('planes: $id', ({ id }) => {
  it('lights the faces turned to the light: lit side = the light’s side, every hour', () => {
    let checked = 0, steep = 0
    const input = worldInput(loaded.get(id)!, at('12:00'))
    for (const hour of HOURS) {
      const w = buildWorld({ ...input, selected: at(hour) })
      const layer = near(sceneModel(w, BOX))
      if (w.light.source === 'sky') {
        // No side (overcast, twilight, a moonless night): no lit band, no lift.
        expect(layer.light.lit).toEqual([])
        expect(layer.light.lift).toBeNull()
        continue
      }
      if (Math.abs(w.light.across) <= 0.05) continue
      if (layer.light.lift) expect(Math.sign(layer.light.lift.dx)).toBe(Math.sign(w.light.across))
      const { toward, away, n } = litByLocalFacing(layer, w)
      steep = Math.max(steep, n)
      if (n < 3 || toward + away < 0.5 || w.light.noonWeight > 0.5) continue
      expect(toward).toBeGreaterThan(away)
      checked++
    }
    // Every place with steep crest stretches is checked at some hour (a flat coast has none).
    if (steep >= 3) expect(checked).toBeGreaterThan(0)
  })

  it('keeps gullies, terraces and vegetation on the ground under the crest and out of the text zones', () => {
    const model = sceneModel(world(id, '12:00'), BOX)
    const sx = BOX.width / SCENE_W
    for (const layer of planesOf(model)) {
      const ridge = layer.outline.slice(0, -2)
      const vegPts: (readonly [number, number])[] = []
      const { trees, tufts } = layer.vegetation
      for (let i = 0; i < trees.length; i += 6) vegPts.push([trees[i], trees[i + 1]])
      for (let i = 0; i < tufts.length; i += 4) vegPts.push([tufts[i], tufts[i + 1]])
      const points = [...layer.gullies.flatMap((g) => g.points), ...layer.terraces.flat(), ...vegPts]
      for (const [x, y] of points) {
        expect(y).toBeGreaterThanOrEqual(lineAt(ridge, x) - 0.6)
        expect(y).toBeLessThanOrEqual(BOX.landHeight)
        for (const zone of model.clear) {
          const inside = x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h
          expect(inside, `${layer.id} at ${(x / sx).toFixed(1)},${y.toFixed(1)} in a text zone`).toBe(false)
        }
      }
    }
    const v = near(model).vegetation
    // Bare desert carries strata only (zero vegetation); vegetated places carry trees, fields or tufts.
    const vegCount = v.trees.length + v.fields.length + v.tufts.length
    expect(vegCount + v.strata.length).toBeGreaterThan(0)
  })

  it('draws the same texture every time, seeded by the place', () => {
    const a = near(sceneModel(world(id, '12:00'), BOX)), b = near(sceneModel(world(id, '12:00'), BOX))
    expect(JSON.stringify([a.gullies, a.terraces, a.grain])).toBe(JSON.stringify([b.gullies, b.terraces, b.grain]))
    expect(a.vegetation).toEqual(b.vegetation)
    expect(record(a)).toEqual(record(b))
  })

  it('fades each plane toward the air with its distance', () => {
    const w = world(id, '12:00')
    const haze = hexOf(hazeOf(w))
    const gaps = [0.5, 1, 2, 5, 10, 20, 40].map((km) => deltaE(hexOf(toneAt(w, km)), haze))
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThanOrEqual(gaps[i] + 1e-3))
    expect(gaps.at(-1)!).toBeLessThan(gaps[0])
    const model = sceneModel(w, BOX)
    const farTones = renderedTones(far(model)), nearTones = renderedTones(near(model))
    const mean = (tones: typeof farTones) => tones.reduce((sum, [, rgb]) => sum + deltaE(hexOf(rgb), haze), 0) / tones.length
    expect(mean(farTones)).toBeLessThan(mean(nearTones))
  })
})

describe('planes: the air, the ground and the light', () => {
  it('fades the far planes more in poor visibility (5 km against 40 km)', () => {
    for (const id of ['haifa', 'jerusalem', 'ein-gedi']) {
      const gap = (km: number) => {
        const w = world(id, '12:00', { visibilityKm: km })
        const haze = hexOf(hazeOf(w))
        const tones = renderedTones(far(sceneModel(w, BOX)))
        return tones.reduce((sum, [, rgb]) => sum + deltaE(hexOf(rgb), haze), 0) / tones.length
      }
      expect(gap(5)).toBeLessThan(gap(40))
    }
  })

  it('turns the air over a jump in a crest’s distance as wide as the jump is deep, never at a seam (C9)', () => {
    // The rule itself: a step of 0.6 spreads over ≥ 0.6 / HAZE_SLOPE px; a gentle run is kept as it is.
    const xs = Array.from({ length: 200 }, (_, i) => i * 1.875)
    const step = hazeAlong(xs, xs.map((x) => (x < 180 ? 0.8 : 0.2)))
    for (let i = 1; i < xs.length; i++) expect(Math.abs(step[i] - step[i - 1])).toBeLessThanOrEqual(HAZE_SLOPE * 1.875 + 1e-9)
    expect(step[0]).toBeCloseTo(0.8)
    expect(step.at(-1)).toBeCloseTo(0.2)
    const gentle = xs.map((x) => 0.3 + 0.001 * x)
    expect(hazeAlong(xs, gentle)).toEqual(gentle)
    // Tiberias in a fog (visibility 1.5 km): the near crest's distance jumps from ~1.5 km to 0.4 km by the town, and its
    // tone turns over the whole stretch, a little at each stop, never a stark step between two stops ~16 px apart (a
    // step of the old ~25 px smoothing was 0.011 a px).
    const w = world('tiberias', '12:00', { humidity: 99, visibilityKm: 1.5, cloudCover: 60, thickCloud: 30, weatherCode: 45 })
    const tones = renderedTones(near(sceneModel(w, BOX)))
    const steps = tones.slice(1).map(([x, rgb], i) => deltaE(hexOf(rgb), hexOf(tones[i][1])) / (x - tones[i][0]))
    expect(Math.max(...steps)).toBeLessThan(0.004)
  })

  it('darkens wet ground', () => {
    const dry = world('haifa', '12:00')
    const wet: WorldState = { ...dry, ground: { ...dry.ground, wet: 1 } }
    const l = (w: WorldState) => toneAt(w, 1).reduce((a, b) => a + b, 0)
    expect(l(wet)).toBeLessThan(l(dry) * 0.95)
  })

  it('puts snow on the land only when snow lies above it', () => {
    const snowy = near(sceneModel(world('jerusalem', '12:00', { snowfall: 2, precipitation: 2, temperature: -1, feelsLike: -4,
      cloudCover: 100, thickCloud: 100, weatherCode: 73 }), BOX))
    expect(snowy.light.snow).not.toBeNull()
    expect(near(sceneModel(world('jerusalem', '12:00'), BOX)).light.snow).toBeNull()
  })

  it('casts no shade, light or floor shadow under a full overcast', () => {
    const w = world('tiberias', '12:00', { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 })
    expect(w.light.ray).toBeNull()
    for (const layer of planesOf(sceneModel(w, BOX))) {
      expect([layer.light.lit, layer.light.shade, layer.light.faces, layer.light.rims]).toEqual([[], [], [], []])
    }
  })

  it('throws the floor shadow away from a low sun', () => {
    const shadows = ['shadmot-mehola', 'rosh-pina', 'tiberias'].flatMap(id => {
      const input = worldInput(loaded.get(id)!, at('08:00'))
      return ['08:00', '15:00'].map(hour => buildWorld({ ...input, selected: at(hour),
        forced: { cloudCover: 0, thickCloud: 0, weatherCode: 0, precipitation: 0, visibilityKm: 30 },
        forcedLayers: { low: 0, mid: 0, high: 0 } }))
    }).filter(w => w.light.source === 'sun').map(w => near(sceneModel(w, BOX)).light.faces)
    expect(shadows.some((faces) => faces.length > 0)).toBe(true)
  })
})

/** What a painter does, on a context that records its calls (node has no canvas). */
function record(desc: LayerOf<'plane'>) {
  const calls: string[] = []
  const fake = (): Ctx2D => new Proxy({}, {
    get: (_, prop) => prop === 'createImageData'
      ? (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
      : prop === 'putImageData' ? (image: ImageData) => { calls.push(`put(${image.data.reduce((a, b) => (a * 31 + b) >>> 0, 7)})`) }
        : (...args: unknown[]) => { calls.push(`${String(prop)}(${args.map((a) => typeof a === 'number' ? a.toFixed(2) : typeof a).join()})`) },
    set: (_, prop, value) => { calls.push(`${String(prop)}=${String(value)}`); return true },
  }) as unknown as Ctx2D
  const env: PaintEnv = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: {} as HTMLCanvasElement, ctx: fake() }) }
  paintPlane(fake(), desc, env)
  return calls
}
