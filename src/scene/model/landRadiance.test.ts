import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { layersOn, sceneModel } from '.'
import { cloudShadowLayers } from './cloudShadows'
import {
  cloudShadowMultiplyRgb, EXPOSURE_GAMMA, FLAT_NORMAL, linearLuminance, litLandLinear, litLandRgb, litRadianceRatio,
  srgbRgbToLinear, surfaceNormal,
} from './landRadiance'
import { rgbOf } from './tone'
import type { LayerOf, SceneBox } from './types'

const DAY = '2026-11-17'
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

/**
 * Evaluates the displayed linear luminance of every cell in a plane's body (`surfaceTone` form palette ×
 * `shadeField` Band 0 `multiply` + `veil` Band 1 `source-over` aerial haze) and returns the median ratio
 * `p50(Y_land) / Y_horizon`.
 */
function planeBodyRatio(world: WorldState, layer: LayerOf<'plane'>): number {
  const { palette, cols, rows, cells } = layer.surfaceTone
  const sf = layer.light.shadeField!
  const veil = layer.light.veil
  const yHor = linearLuminance(srgbRgbToLinear(rgbOf(world.light.palette.horizon)))
  const ys: number[] = []
  for (let r = 0; r < rows; r++) {
    const sr = Math.min(sf.rows - 1, Math.round((r / Math.max(1, rows - 1)) * (sf.rows - 1)))
    for (let c = 0; c < cols; c++) {
      const form = palette[cells[r * cols + c]] ?? layer.fill
      const sc = Math.min(sf.cols - 1, Math.round((c / Math.max(1, cols - 1)) * (sf.cols - 1)))
      const o = (sr * sf.cols + sc) * 3
      const mul: RGB = [form[0] * (sf.rgb[o] / 255), form[1] * (sf.rgb[o + 1] / 255), form[2] * (sf.rgb[o + 2] / 255)]
      const vi = Math.min(veil.length - 1, Math.round((c / Math.max(1, cols - 1)) * (veil.length - 1)))
      const [, vRgb, vAlpha] = veil[vi] ?? [0, [0, 0, 0] as RGB, 0]
      const out: RGB = [
        mul[0] * (1 - vAlpha) + vRgb[0] * vAlpha,
        mul[1] * (1 - vAlpha) + vRgb[1] * vAlpha,
        mul[2] * (1 - vAlpha) + vRgb[2] * vAlpha,
      ]
      ys.push(linearLuminance(srgbRgbToLinear(out)) / yHor)
    }
  }
  return median(ys)
}

describe('Stage 7: physical land lighting across all 8 baseline places', () => {
  it('places 12:00 plane-body p50 linear Y / horizon Y in [0.18, 0.45] and 06:20 & 16:30 in [0.08, 0.30] for every place', () => {
    const summary: Record<string, Record<string, string>> = {}
    const failures: string[] = []
    for (const { id } of SCENE_PLACES) {
      const build = makeWorldBuilder()
      const base = worldInput(loaded.get(id)!, `${DAY}T12:00` as LocalTime)
      summary[id] = {}
      for (const hour of ['06:20', '12:00', '16:30', '21:00'] as const) {
        const w = build({ ...base, selected: `${DAY}T${hour}` as LocalTime })
        const near = layersOn(sceneModel(w, BOX), 'land').find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!
        const ratio = planeBodyRatio(w, near)
        const yHor = linearLuminance(srgbRgbToLinear(rgbOf(w.light.palette.horizon)))
        const medV = near.light.veil[Math.floor(near.light.veil.length / 2)]?.[2] ?? 0
        summary[id][hour] = `${ratio.toFixed(3)} (yH=${yHor.toFixed(2)},sun=${w.light.shares.sun.toFixed(2)},dif=${w.light.diffuse.toFixed(2)},vA=${medV.toFixed(2)})`
        if (hour === '12:00' && (ratio < 0.18 || ratio > 0.45)) failures.push(`${id} 12:00: ${ratio.toFixed(3)}`)
        else if ((hour === '06:20' || hour === '16:30') && (ratio < 0.08 || ratio > 0.30)) failures.push(`${id} ${hour}: ${ratio.toFixed(3)}`)
        else if (hour === '21:00' && (ratio * yHor >= 0.025 || ratio >= 0.35)) failures.push(`${id} 21:00: ${ratio.toFixed(3)}`)
      }
    }
    expect(failures, JSON.stringify(summary, null, 2)).toEqual([])
  }, 60_000)

  it('lights a sun-facing face brighter than a sun-away face by the exact computed physical ratio', () => {
    const base = worldInput(loaded.get('jerusalem')!, `${DAY}T08:00` as LocalTime)
    const clearMorning = buildWorld({
      ...base,
      forced: { cloudCover: 0, thickCloud: 0, weatherCode: 0, precipitation: 0, visibilityKm: 30 },
      forcedLayers: { low: 0, mid: 0, high: 0 },
    })
    const albedo: RGB = [0.38, 0.40, 0.32]
    // Morning sun is on screen-left (`dir.across < 0`): a slope rising right (`acrossSlope > 0`) faces left (lit).
    expect(clearMorning.light.dir.across).toBeLessThan(-0.3)
    const litNormal = surfaceNormal(0.5, 0)
    const awayNormal = surfaceNormal(-0.5, 0)
    const rLit = litRadianceRatio(clearMorning, albedo, litNormal)
    const rAway = litRadianceRatio(clearMorning, albedo, awayNormal)
    expect(rLit / rAway).toBeGreaterThan(2.5)
    const yLit = linearLuminance(litLandLinear(clearMorning, albedo, litNormal))
    const yAway = linearLuminance(litLandLinear(clearMorning, albedo, awayNormal))
    expect(yLit / yAway).toBeCloseTo((rLit / rAway) ** EXPOSURE_GAMMA, 4)
  })

  it('keeps cloud shadows >= diffuse-only radiance under a clear sun and removes only the direct term', () => {
    const base = worldInput(loaded.get('jerusalem')!, `${DAY}T12:00` as LocalTime)
    const broken = buildWorld({
      ...base,
      forced: { cloudCover: 50, thickCloud: 40, weatherCode: 2, precipitation: 0, visibilityKm: 30 },
      forcedLayers: { low: 0.45, mid: 0.25, high: 0 },
    })
    const layers = cloudShadowLayers(broken, BOX)
    expect(layers.length).toBeGreaterThan(0)
    const g = cloudShadowMultiplyRgb(broken, FLAT_NORMAL)
    const albedo: RGB = [0.40, 0.39, 0.33]
    const litSrgb = litLandRgb(broken, albedo, FLAT_NORMAL, 0, undefined, 1)
    const diffSrgb = litLandRgb(broken, albedo, FLAT_NORMAL, 0, undefined, 0)
    const yLit = linearLuminance(srgbRgbToLinear(litSrgb))
    const yDiff = linearLuminance(srgbRgbToLinear(diffSrgb))
    // Full-opacity cloud shadow (`a = 1`, `multiply` with `g`) equals diffuse-only radiance within gamma 2.2 vs sRGB tolerance.
    const coreShadow: RGB = [litSrgb[0] * g[0], litSrgb[1] * g[1], litSrgb[2] * g[2]]
    const yCore = linearLuminance(srgbRgbToLinear(coreShadow))
    expect(yCore).toBeGreaterThanOrEqual(yDiff * 0.94)
    expect(yCore).toBeLessThanOrEqual(yDiff * 1.06)
    expect(yCore).toBeLessThan(yLit)
    // Every emitted blob leaves >= diffuse-only radiance.
    for (const layer of layers) {
      expect(layer.blend).toBe('multiply')
      for (const blob of layer.blobs) {
        const a = blob.alpha
        const under: RGB = [
          litSrgb[0] * (1 - a * (1 - layer.rgb[0])),
          litSrgb[1] * (1 - a * (1 - layer.rgb[1])),
          litSrgb[2] * (1 - a * (1 - layer.rgb[2])),
        ]
        const yUnder = linearLuminance(srgbRgbToLinear(under))
        expect(yUnder).toBeGreaterThanOrEqual(yDiff * 0.94)
        expect(yUnder).toBeLessThanOrEqual(yLit + 1e-6)
      }
    }
  })

  it('applies exact linear wet darkening (×(1 − 0.45·wet) reflectance) and produces flat diffuse light under overcast', () => {
    const base = worldInput(loaded.get('haifa')!, `${DAY}T12:00` as LocalTime)
    const dry = buildWorld({ ...base, forced: { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 } })
    const wet: WorldState = { ...dry, ground: { ...dry.ground, wet: 1 } }
    const albedo: RGB = [0.36, 0.38, 0.30]
    expect(litRadianceRatio(wet, albedo) / litRadianceRatio(dry, albedo)).toBeCloseTo(0.55, 5)

    const overcast = buildWorld({
      ...base,
      forced: { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 },
      forcedLayers: { low: 1, mid: 1, high: 0 },
    })
    // Under full overcast, left-facing and right-facing slopes receive identical diffuse irradiance.
    expect(litRadianceRatio(overcast, albedo, surfaceNormal(0.4, 0)))
      .toBeCloseTo(litRadianceRatio(overcast, albedo, surfaceNormal(-0.4, 0)), 6)
  })
})
