import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { deltaE } from '../../theme/oklab'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LivingLand, LivingLandSample } from '../../world/landLiving'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { LayerCache, type LayerCanvas } from '../compose/layerCache'
import { HAND, type Ctx2D } from '../paint/hand'
import { paintLitSurface } from '../paint/planeTexel'
import { layersOn, sceneModel } from '.'
import { planeSurfaceOf } from './landColour'
import { FLAT_NORMAL, litLandRgb } from './landRadiance'
import { hazeAt, hazeOf } from './landVeil'
import { hexOf, labOf } from './tone'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => { stubPublicFetch(); loaded = await loadPlaces() })
afterAll(() => { vi.unstubAllGlobals() })

const sample = (albedo: RGB, source: LivingLandSample['albedoSource']): LivingLandSample => ({
  cover: 4, coverSource: 'worldcover-2021:local-50m', albedo, albedoSource: source, albedoDate: null,
  ndvi: 0.3, ndviSource: 'climatology', ndviDate: null, dryness: 0.4, drynessSource: 'climatology', drynessDate: null,
  snow: 0, snowSource: 'climatology', snowDate: null,
})

describe('Stage 3 geometry, outside-ground locality & water reflection key', () => {
  it('aligns steep uneven near faces by projected y and maps partly occluded far faces to their local visible foot', () => {
    const base = buildWorld(worldInput(loaded.get('shadmot-mehola')!, '2026-11-17T12:00'))
    const sand: RGB = [0.68, 0.56, 0.36], green: RGB = [0.20, 0.46, 0.18]
    const bands = [
      { distanceM: 500, elevationM: 0, sample: sample(green, 's2:2026-11-15') },
      { distanceM: 1800, elevationM: 0, sample: sample(green, 's2:2026-11-15') },
      { distanceM: 2200, elevationM: 0, sample: sample(sand, 's2:2026-11-15') },
      { distanceM: 30_000, elevationM: 0, sample: sample(sand, 'gibs:2026-11-01') },
    ]
    const land: LivingLand = {
      ...base.land, own: sample(green, 's2:2026-11-15'),
      rays: base.land.rays.map((r) => ({ ...r, bands })),
    }
    // Uneven near face: 6 points packed near crest y=40..65 (km 5..3.5), transition to km=2 at y=75, foot at y=128 (km=0.5).
    const nearPts = [
      { y: 45, km: 4.8, h: 0, slope: 0 }, { y: 50, km: 4.5, h: 0, slope: 0 }, { y: 55, km: 4.2, h: 0, slope: 0 },
      { y: 60, km: 4.0, h: 0, slope: 0 }, { y: 65, km: 3.5, h: 0, slope: 0 }, { y: 75, km: 2.0, h: 0, slope: 0 },
      { y: 128, km: 0.5, h: 0, slope: 0 },
    ]
    const farPts = [{ y: 45, km: 30, h: 0, slope: 0 }, { y: 63, km: 1.5, h: 0, slope: 0 }]
    const flatPlane = (y: number, km: number) => ({ points: [[0, y], [375, y]] as [number, number][], distanceKm: [km, km] })
    const w: WorldState = {
      ...base, land,
      terrain: {
        ...base.terrain, near: flatPlane(40, 5), far: flatPlane(40, 30),
        faces: {
          near: { columns: [{ x: 0, crest: 40, points: nearPts }, { x: 375, crest: 40, points: nearPts }], contours: [] },
          far: { columns: [{ x: 0, crest: 40, points: farPts }, { x: 375, crest: 40, points: farPts }], contours: [] },
        },
      },
    }
    const nearSpec = planeSurfaceOf(w, 'near', w.terrain.near, 128)
    const { palette, cols, cells } = nearSpec.palette
    const toneOf = (r: number) => palette[cells[r * cols + Math.floor(cols / 2)]]
    // Row 1 is at y = 40 + (128-40)/3 = 69.3 (km ≈ 2.85 -> sand); Row 2 is at y = 98.7 (km ≈ 1.33 -> green!)
    expect(labOf(toneOf(1)).a).toBeGreaterThan(labOf(toneOf(2)).a + 0.04)

    // Partly occluded far plane: crest y=40, near crest y=64 -> outline bottom y=67 (not canvas-wide 128).
    const wFar: WorldState = { ...w, terrain: { ...w.terrain, near: flatPlane(64, 5), sightAt: () => ({ nearKm: 5, farKm: 30, farShows: true }) } }
    const farSpec = planeSurfaceOf(wFar, 'far', wFar.terrain.far, 128)
    let captured: ImageData | null = null
    const scratchCtx = { createImageData: (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: (img: ImageData) => { captured = img } } as unknown as Ctx2D
    const mainCtx = { imageSmoothingEnabled: true, drawImage: () => {} } as unknown as Ctx2D
    const outline: [number, number][] = [[0, 40], [375, 40], [375, 67], [0, 67]]
    const neutral = { cols: 1, rows: 1, grid: new Uint8Array([0, 0, 255, 0]),
      eSun: [0, 0, 0], eMoon: [0, 0, 0], eSky: [1, 1, 1], hazeLin: [0, 0, 0], yHorizon: 1 } as const
    paintLitSurface(mainCtx, outline, { x: 0, y: 39, w: 375, h: 89 }, farSpec.palette, neutral, 'far-test', 0, 7,
      { hand: HAND, phase: 0, scale: 1, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx: scratchCtx }) })
    // At y = 63 (texel row j = Math.floor((63 - 39) / 3) = 8), pixel must show the lower green foot, not stay on crest sand!
    const px = (j: number) => {
      const o = (j * captured!.width + Math.floor(captured!.width / 2)) * 4
      return [captured!.data[o] / 255, captured!.data[o + 1] / 255, captured!.data[o + 2] / 255] as RGB
    }
    expect(labOf(px(8)).a).toBeLessThan(labOf(px(1)).a - 0.03)
  })

  it('resolves outside-ground stops from world.land.local rather than distant panorama rays', () => {
    const place = [...loaded.values()].find((p) => {
      const w = buildWorld(worldInput(p, '2026-11-17T12:00'))
      return w.place3.kind === 'outside' && Boolean(w.place3.land)
    })!
    const base = buildWorld(worldInput(place, '2026-11-17T12:00'))
    const eastGreen: RGB = [0.16, 0.50, 0.18], westSand: RGB = [0.72, 0.58, 0.34], panoRed: RGB = [0.82, 0.20, 0.16]
    const local = base.land.local.map((pt) => ({
      ...pt, sample: sample(pt.eastM >= 0 ? eastGreen : westSand, pt.eastM >= 0 ? 's2:2026-11-15' : 's2:2026-11-14'),
    }))
    const rays = base.land.rays.map((r) => ({ ...r, bands: r.bands.map((b) => ({ ...b, sample: sample(panoRed, 'gibs:2026-11-01') })) }))
    const w: WorldState = { ...base, land: { ...base.land, local, own: local[4].sample, rays } }
    const out = layersOn(sceneModel(w, BOX), 'land').find((l): l is LayerOf<'outside'> => l.kind === 'outside')!
    expect(out.land!.source).toMatch(/^s2:2026-11-1/)
    expect(out.land!.stops.length).toBeGreaterThanOrEqual(2)
    // In the south-facing portrait, east is left (stop 0) and west is right (last stop); neither matches terracotta red rays.
    const leftStop = out.land!.stops[0][1], rightStop = out.land!.stops.at(-1)![1]
    const litPanoRed = litLandRgb(w, panoRed, FLAT_NORMAL, hazeAt(w, w.place3.kind === 'outside' && w.place3.land ? w.place3.land.km : 1), hazeOf(w))
    expect(labOf(leftStop).a).toBeLessThan(labOf(rightStop).a - 0.02)
    expect(deltaE(hexOf(leftStop), hexOf(litPanoRed))).toBeGreaterThan(0.08)
    expect(deltaE(hexOf(rightStop), hexOf(litPanoRed))).toBeGreaterThan(0.08)
  })

  it('repaints water.light on same-hour living-land arrival while keeping water form key stable', () => {
    const base = buildWorld(worldInput(loaded.get('haifa')!, '2026-11-17T12:00'))
    const darkW: WorldState = { ...base, land: { ...base.land, local: base.land.local.map((p) => ({ ...p, sample: sample([0.14, 0.24, 0.14], 's2:2026-11-15') })) } }
    const brightW: WorldState = { ...base, land: { ...base.land, local: base.land.local.map((p) => ({ ...p, sample: sample([0.72, 0.62, 0.44], 's2:2026-11-15') })) } }
    const wDark = layersOn(sceneModel(darkW, BOX), 'land').find((l): l is LayerOf<'water'> => l.id === 'water.near')!
    const wBright = layersOn(sceneModel(brightW, BOX), 'land').find((l): l is LayerOf<'water'> => l.id === 'water.near')!
    expect(wDark.key).toBe(wBright.key)
    expect(wDark.light!.key).not.toBe(wBright.light!.key)
    const count = { form: 0, light: 0 }
    const noopCtx = new Proxy({}, { get: () => () => {}, set: () => true })
    const fakeCanvas = (w: number, h: number) => ({ width: w, height: h, getContext: () => noopCtx }) as unknown as LayerCanvas
    const cache = new LayerCache({ factory: fakeCanvas, painters: () => ({ form: () => { count.form++ }, light: () => { count.light++ } }), now: () => 0 })
    cache.update(wDark, 2)
    expect(cache.update(wBright, 2)).toBe('light')
    expect(count).toEqual({ form: 1, light: 2 })
  })
})
