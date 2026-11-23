import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { deltaE } from '../../theme/oklab'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { outlineBandY, TEXEL } from './planeBands'
import { skyLayer, stopAt } from './sky'
import { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb } from '../paint/shared/land/planeTexel'
import { layersOn, sceneModel } from '.'
import { cloudShadowsOf } from './cloudShadows'
import {
  EXPOSURE_GAMMA, FLAT_NORMAL, linearLuminance, litLandLinear, litLandRgb, litRadianceRatio,
  srgbRgbToLinear, surfaceNormal,
} from './landRadiance'
import { hazeAt, hazeOf } from './landVeil'
import { hexOf, mixRgb, rgbOf } from './tone'
import type { LayerOf, SceneBox } from './types'

const DAY = '2026-11-17'
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

function renderedTexels(layer: LayerOf<'plane'>): number[] {
  const t = preparePlaneTexels(layer.outline, layer.bounds, layer.surfaceTone, layer.light.litField, layer.grain.seed, layer.grain.amount)
  const ys: number[] = []
  for (let j = 0; j < t.hPx; j++) {
    const y = layer.bounds.y + (j + 0.5) * TEXEL
    for (let i = 0; i < t.wPx; i++) {
      if (y < t.crestY[i] + 1 || y > t.footY[i]) continue
      const x = layer.bounds.x + (i + 0.5) * TEXEL
      const out = shadeTexelSrgb(t, samplePlaneTexel(t, i, x, y))
      ys.push(linearLuminance(srgbRgbToLinear(out)))
    }
  }
  return ys
}

function quantile(sorted: number[], p: number) {
  return sorted[Math.floor(p * (sorted.length - 1))] ?? 0
}

function renderedPlaneRatio(layer: LayerOf<'plane'>, ySky: number) {
  const ys = renderedTexels(layer).sort((a, b) => a - b)
  return { p50: quantile(ys, 0.5) / ySky, p10: quantile(ys, 0.1) / ySky, p90: quantile(ys, 0.9) / ySky }
}

/** Twilight's display reference is the sky band above the drawn crest. */
function twilightSkyY(world: WorldState, planes: LayerOf<'plane'>[]) {
  const cols = Math.ceil(BOX.width / TEXEL)
  const skyline = new Float32Array(cols).fill(BOX.landHeight)
  for (const plane of planes) {
    const { crestY } = outlineBandY(plane.outline, plane.bounds, cols)
    for (let i = 0; i < cols; i++) skyline[i] = Math.min(skyline[i], crestY[i])
  }
  const { stops, glow, band } = skyLayer(world, BOX)!
  const sky = Array.from(skyline, (crest, col) => {
    const x = (col + 0.5) * TEXEL, y = crest + BOX.landTop - 8
    let rgb = stopAt(stops, y / BOX.skyHeight)
    for (const g of glow) {
      const radius = Math.hypot((x - g.x) / g.r, (y - g.y) / (g.ry ?? g.r))
      rgb = mixRgb(rgb, g.rgb, g.alpha * Math.max(0, 1 - radius))
    }
    if (band && y >= band.y - band.h && y < band.y + 0.3 * band.h) {
      const t = (y - band.y + band.h) / (1.3 * band.h)
      const alpha = stopAt([[0, [0, 0, 0]], [0.45, [0.35, 0.35, 0.35]], [1 / 1.3, [1, 1, 1]], [1, [0.4, 0.4, 0.4]]], t)[0]
      rgb = mixRgb(rgb, band.rgb, band.alpha * alpha)
    }
    return linearLuminance(srgbRgbToLinear(rgb))
  })
  return quantile(sky.sort((a, b) => a - b), 0.5)
}

describe('Stage 7: physical linear-light land radiance across all 8 baseline places', () => {
  it('keeps visible noon relief, twilight ratios and dark nights in the rendered body', () => {
    const summary: Record<string, Record<string, string>> = {}
    const failures: string[] = []
    for (const { id } of SCENE_PLACES) {
      const build = makeWorldBuilder()
      const base = worldInput(loaded.get(id)!, `${DAY}T12:00` as LocalTime)
      summary[id] = {}
      for (const hour of ['06:20', '12:00', '16:30', '21:00'] as const) {
        const w = build({ ...base, selected: `${DAY}T${hour}` as LocalTime })
        const planes = layersOn(sceneModel(w, BOX), 'land').filter((l): l is LayerOf<'plane'> => l.kind === 'plane')
        const yHor = linearLuminance(srgbRgbToLinear(rgbOf(w.light.palette.horizon)))
        const ySky = hour === '06:20' || hour === '16:30' ? twilightSkyY(w, planes) : yHor
        const { p10, p50, p90 } = renderedPlaneRatio(planes.find((p) => p.plane === 'near')!, ySky)
        summary[id][hour] = `${p50.toFixed(3)} [${p10.toFixed(3)}..${p90.toFixed(3)}]`
        if (hour === '12:00' && (p50 < 0.18 || p50 > 0.45 || p90 - p10 < 0.03)) failures.push(`${id} 12:00: ${p50.toFixed(3)}`)
        else if ((hour === '06:20' || hour === '16:30') && (p50 < 0.08 || p50 > 0.30)) failures.push(`${id} ${hour}: ${p50.toFixed(3)}`)
        else if (hour === '21:00' && (p50 * yHor >= 0.025 || p50 >= 0.35)) failures.push(`${id} 21:00: ${p50.toFixed(3)}`)
      }
    }
    expect(failures, JSON.stringify(summary, null, 2)).toEqual([])
  }, 60_000)

  it('guarantees exact parity (max ΔE Oklab < 0.01) between terrain painter texels and shared litLandRgb on coloured albedos × coloured light', () => {
    const base = worldInput(loaded.get('ramon-crater')!, `${DAY}T07:30` as LocalTime)
    const warmMorning = buildWorld({ ...base, forced: { cloudCover: 0, thickCloud: 0, weatherCode: 0, precipitation: 0, visibilityKm: 30 } })
    const near = layersOn(sceneModel(warmMorning, BOX), 'land').find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!
    const lf = near.light.litField!
    const albedos: RGB[] = [[0.58, 0.36, 0.22], [0.22, 0.42, 0.19], [0.46, 0.44, 0.36], [0.30, 0.24, 0.38]]
    const haze = hazeOf(warmMorning)
    for (const albedo of albedos) {
      // Flat uniform single-cell surface at zero grain + flat normal at centre bearing (sVis = sunDir.up, vSky = 1, haze = 0.2).
      const expected = litLandRgb(warmMorning, albedo, FLAT_NORMAL, 0.2, haze, 1)
      const sVis = Math.max(0, warmMorning.light.dir.up)
      const grid = new Uint8Array([Math.round(sVis * 255), 0, 255, Math.round(0.2 * 255)])
      const syntheticField = { ...lf, cols: 1, rows: 1, grid, snow: null }
      const t = preparePlaneTexels(near.outline, near.bounds, { palette: [albedo], cols: 1, rows: 1, cells: [0], source: 'test' }, syntheticField, 1, 0)
      const actual = shadeTexelSrgb(t, samplePlaneTexel(t, 0, near.bounds.x + 1, near.bounds.y + 1), 1)
      expect(deltaE(hexOf(actual), hexOf(expected))).toBeLessThan(0.01)
    }
  })

  it('lights sun-facing faces brighter by exact physical law, never darkens path haze under cloud shadow, and disables cloud shadows for moonlight', () => {
    const base = worldInput(loaded.get('jerusalem')!, `${DAY}T08:00` as LocalTime)
    const clearMorning = buildWorld({
      ...base,
      forced: { cloudCover: 0, thickCloud: 0, weatherCode: 0, precipitation: 0, visibilityKm: 30 },
      forcedLayers: { low: 0, mid: 0, high: 0 },
    })
    const albedo: RGB = [0.38, 0.40, 0.32]
    expect(clearMorning.light.dir.across).toBeLessThan(-0.3)
    const litNormal = surfaceNormal(0.5, 0), awayNormal = surfaceNormal(-0.5, 0)
    const rLit = litRadianceRatio(clearMorning, albedo, litNormal)
    const rAway = litRadianceRatio(clearMorning, albedo, awayNormal)
    expect(rLit / rAway).toBeGreaterThan(2.5)
    const yLit = linearLuminance(litLandLinear(clearMorning, albedo, litNormal))
    const yAway = linearLuminance(litLandLinear(clearMorning, albedo, awayNormal))
    expect(yLit / yAway).toBeCloseTo((rLit / rAway) ** EXPOSURE_GAMMA, 4)

    // Fully shadowed hazy face: direct term removed BEFORE compression and BEFORE linear haze (haze stays un-darkened).
    const brokenNoon = buildWorld({
      ...worldInput(loaded.get('jerusalem')!, `${DAY}T12:00` as LocalTime),
      forced: { cloudCover: 50, thickCloud: 40, weatherCode: 2, precipitation: 0, visibilityKm: 12 },
      forcedLayers: { low: 0.45, mid: 0.25, high: 0 },
    })
    const haze = hazeOf(brokenNoon), airY = linearLuminance(srgbRgbToLinear(haze)), h = hazeAt(brokenNoon, 5)
    const shLin = litLandLinear(brokenNoon, albedo, FLAT_NORMAL, 0, h, haze)
    const diffNoHaze = litLandLinear(brokenNoon, albedo, FLAT_NORMAL, 0, 0)
    expect(linearLuminance(shLin)).toBeCloseTo(linearLuminance(diffNoHaze) * (1 - h) + airY * h, 4)
    expect(linearLuminance(shLin)).toBeGreaterThan(linearLuminance(diffNoHaze))

    expect(cloudShadowsOf(brokenNoon, BOX).length).toBeGreaterThan(0)
    const moonNight = buildWorld({
      ...worldInput(loaded.get('jerusalem')!, `${DAY}T21:00` as LocalTime),
      forced: { cloudCover: 40, thickCloud: 30, weatherCode: 2, precipitation: 0, visibilityKm: 30 },
      forcedLayers: { low: 0.4, mid: 0.2, high: 0 },
    })
    expect(cloudShadowsOf(moonNight, BOX)).toEqual([])
  })

  it('applies exact linear wet darkening (×(1 − 0.45·wet)), produces flat diffuse overcast,', () => {
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
    expect(litRadianceRatio(overcast, albedo, surfaceNormal(0.4, 0)))
      .toBeCloseTo(litRadianceRatio(overcast, albedo, surfaceNormal(-0.4, 0)), 6)
  })
})
